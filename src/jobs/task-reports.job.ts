import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InternalTask } from 'src/modules/internal-tasks/entities/internal-task.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { EmailService } from 'src/modules/email/email.service';

@Injectable()
export class TaskReportsJob {
  private readonly logger = new Logger(TaskReportsJob.name);

  constructor(
    @InjectRepository(InternalTask)
    private readonly taskRepository: Repository<InternalTask>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.logger.log('TaskReportsJob initialized');
    console.log('TaskReportsJob carregado ✔️');
  }

  /**
   * Executa todo dia às 8:30 da manhã
   * Envia relatórios de tarefas pendentes
   */
  @Cron('30 8 * * *')
  async sendDailyTaskReports(): Promise<void> {
    this.logger.log('📧 Iniciando envio de relatórios de tarefas...');

    try {
      const reportDate = this.formatDate(new Date());

      // 1. Buscar todas as tarefas não concluídas
      const pendingTasks = await this.getPendingTasks();

      if (pendingTasks.length === 0) {
        this.logger.log('📅 Nenhuma tarefa pendente. Emails não serão enviados.');
        return;
      }

      this.logger.log(`📋 Encontradas ${pendingTasks.length} tarefa(s) pendente(s).`);

      // 2. Enviar relatório geral para gestores
      await this.sendManagerReports(pendingTasks, reportDate);

      // 3. Enviar relatórios individuais para funcionários
      await this.sendEmployeeReports(pendingTasks, reportDate);

      this.logger.log('✅ Relatórios de tarefas enviados com sucesso!');
    } catch (error) {
      this.logger.error('❌ Erro ao enviar relatórios de tarefas:', error);
    }
  }

  /**
   * Busca todas as tarefas não concluídas
   */
  private async getPendingTasks(): Promise<InternalTask[]> {
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.coResponsible', 'coResponsible')
      .leftJoinAndSelect('task.assistants', 'assistants')
      .leftJoinAndSelect('task.kanban', 'kanban')
      .where('LOWER(column.name) != :completed', { completed: 'concluído' })
      .andWhere('LOWER(column.name) != :done', { done: 'concluido' })
      .andWhere('LOWER(column.name) != :finished', { finished: 'finalizado' })
      .orderBy('task.dueDate', 'ASC')
      .getMany();

    return tasks;
  }

  /**
   * Envia relatórios gerais para gestores
   */
  private async sendManagerReports(
    tasks: InternalTask[],
    reportDate: string,
  ): Promise<void> {
    // Buscar gestores internos (usuários NÃO root com rule 'administrator')
    const managers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('role.roleRules', 'roleRules')
      .leftJoinAndSelect('roleRules.rule', 'rule')
      .where('user.isRootUser = :isRootUser', { isRootUser: false })
      .andWhere('rule.rule = :adminRule', { adminRule: 'administrator' })
      .getMany();

    this.logger.log(`👥 Encontrados ${managers.length} gestor(es).`);

    for (const manager of managers) {
      if (!manager.email) {
        this.logger.warn(`⚠️ Gestor ${manager.name} não possui email cadastrado.`);
        continue;
      }

      try {
        const formattedTasks = tasks.map((task) => ({
          dueDate: this.formatDateTime(task.dueDate),
          title: task.title,
          priority: task.priority,
          responsible: task.responsible?.name || 'Não atribuído',
          isOverdue: task.dueDate ? new Date(task.dueDate) < new Date() : false,
        }));

        await this.emailService.sendTaskReportToManager({
          managerName: manager.name,
          managerEmail: manager.email,
          reportDate,
          tasks: formattedTasks,
          totalTasks: tasks.length,
        });

        this.logger.log(`✉️ Relatório geral enviado para ${manager.name}`);
      } catch (error) {
        this.logger.error(`❌ Erro ao enviar email para ${manager.name}:`, error);
      }
    }
  }

  /**
   * Envia relatórios individuais para funcionários
   */
  private async sendEmployeeReports(
    tasks: InternalTask[],
    reportDate: string,
  ): Promise<void> {
    // Agrupar tarefas por usuário
    const userTasksMap = new Map<string, Array<{ task: InternalTask; role: string }>>();

    for (const task of tasks) {
      // Responsável
      if (task.responsible) {
        if (!userTasksMap.has(task.responsible.id)) {
          userTasksMap.set(task.responsible.id, []);
        }
        userTasksMap.get(task.responsible.id)!.push({
          task,
          role: 'Responsável',
        });
      }

      // Corresponsável
      if (task.coResponsible) {
        if (!userTasksMap.has(task.coResponsible.id)) {
          userTasksMap.set(task.coResponsible.id, []);
        }
        userTasksMap.get(task.coResponsible.id)!.push({
          task,
          role: 'Corresponsável',
        });
      }

      // Assistentes
      if (task.assistants && task.assistants.length > 0) {
        for (const assistant of task.assistants) {
          if (!userTasksMap.has(assistant.id)) {
            userTasksMap.set(assistant.id, []);
          }
          userTasksMap.get(assistant.id)!.push({
            task,
            role: 'Assistente',
          });
        }
      }
    }

    this.logger.log(`👤 Enviando relatórios para ${userTasksMap.size} funcionário(s).`);

    // Enviar email para cada funcionário
    for (const [userId, userTasks] of userTasksMap.entries()) {
      try {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        // Apenas usuários internos com e-mail cadastrado recebem relatório individual
        if (!user || user.isRootUser || !user.email) {
          this.logger.warn(
            `⚠️ Usuário ID ${userId} não encontrado, sem email ou marcado como cliente (isRootUser). Relatório não enviado.`,
          );
          continue;
        }

        const formattedTasks = userTasks.map(({ task, role }) => ({
          dueDate: this.formatDateTime(task.dueDate),
          title: task.title,
          priority: task.priority,
          role,
          isOverdue: task.dueDate ? new Date(task.dueDate) < new Date() : false,
        }));

        await this.emailService.sendTaskReportToEmployee({
          employeeName: user.name,
          employeeEmail: user.email,
          reportDate,
          tasks: formattedTasks,
          totalTasks: userTasks.length,
        });

        this.logger.log(`✉️ Relatório individual enviado para ${user.name}`);
      } catch (error) {
        this.logger.error(`❌ Erro ao enviar email para usuário ID ${userId}:`, error);
      }
    }
  }

  /**
   * Formata data para DD/MM/YYYY
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formata data e hora para DD/MM/YYYY HH:mm
   */
  private formatDateTime(date: Date | null): string {
    if (!date) return 'Sem prazo';

    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}



























