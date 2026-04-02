import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InternalTask, InternalTaskRecurrenceType } from '../modules/internal-tasks/entities/internal-task.entity';
import { TaskColumn } from '../modules/internal-tasks/entities/task-column.entity';
import { Company } from '../modules/companies/entities/companies.entity';

@Injectable()
export class InternalTasksRecurrenceJob {
  private readonly logger = new Logger(InternalTasksRecurrenceJob.name);

  constructor(
    @InjectRepository(InternalTask)
    private readonly taskRepository: Repository<InternalTask>,
    @InjectRepository(TaskColumn)
    private readonly columnRepository: Repository<TaskColumn>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {
    this.logger.log('InternalTasksRecurrenceJob initialized');
  }

  onModuleInit() {
    console.log('InternalTasksRecurrenceJob carregado ✔️');
  }

  /**
   * Calcula a próxima data de recorrência baseado no tipo
   */
  private calculateNextRecurrenceDate(
    task: InternalTask,
    fromDate: Date = new Date(),
  ): Date | null {
    if (!task.recurrenceType) return null;

    const now = new Date(fromDate);
    now.setSeconds(0, 0);
    now.setMilliseconds(0);

    // DIÁRIA
    if (task.recurrenceType === InternalTaskRecurrenceType.DAILY) {
      const interval = 1; // Sempre diária quando tipo DAILY
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + interval);
      
      // Sempre usar 8h da manhã para tarefas recorrentes
      nextDate.setHours(8, 0, 0, 0);
      
      return nextDate;
    }

    // SEMANAL
    if (task.recurrenceType === InternalTaskRecurrenceType.WEEKLY) {
      const interval = 1; // Sempre semanal (1 semana)
      const weekDays = task.recurrenceDaysOfWeek?.map(Number) || [];
      
      if (weekDays.length === 0) {
        // Se não especificou dias, usa o mesmo dia da semana da tarefa original
        const originalDate = task.dueDate || task.startDate || task.createdAt;
        if (originalDate) {
          const originalDay = new Date(originalDate).getDay();
          weekDays.push(originalDay);
        } else {
          weekDays.push(now.getDay()); // Usa o dia atual
        }
      }

      // Procura o próximo dia válido
      for (let i = 0; i < 7 * interval; i++) {
        const candidate = new Date(now);
        candidate.setDate(now.getDate() + i);
        const candidateDay = candidate.getDay();

        if (weekDays.includes(candidateDay) && candidate > now) {
          // Sempre usar 8h da manhã para tarefas recorrentes
          candidate.setHours(8, 0, 0, 0);
          return candidate;
        }
      }
    }

    // MENSAL
    if (task.recurrenceType === InternalTaskRecurrenceType.MONTHLY) {
      const dayOfMonth = task.recurrenceDayOfMonth;
      if (!dayOfMonth) return null;

      const interval = 1; // Sempre mensal (1 mês)
      
      // Tenta no mês atual
      const currentMonth = new Date(now);
      currentMonth.setDate(dayOfMonth);
      // Sempre usar 8h da manhã para tarefas recorrentes
      currentMonth.setHours(8, 0, 0, 0);
      
      if (currentMonth > now && dayOfMonth <= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) {
        return currentMonth;
      }

      // Próximo mês
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + interval, dayOfMonth);
      // Sempre usar 8h da manhã para tarefas recorrentes
      nextMonth.setHours(8, 0, 0, 0);
      
      // Ajusta se o dia não existe no mês (ex: 31 em fevereiro)
      const lastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      if (dayOfMonth > lastDayOfMonth) {
        nextMonth.setDate(lastDayOfMonth);
      }
      
      return nextMonth;
    }

    // ANUAL
    if (task.recurrenceType === InternalTaskRecurrenceType.YEARLY) {
      const interval = 1; // Sempre anual (1 ano)
      const dayOfMonth = task.recurrenceDayOfMonth || new Date(now).getDate();
      
      // Tenta no ano atual
      const originalDate = task.dueDate || task.startDate || task.createdAt;
      const month = originalDate ? new Date(originalDate).getMonth() : now.getMonth();
      
      const currentYear = new Date(now.getFullYear(), month, dayOfMonth);
      // Sempre usar 8h da manhã para tarefas recorrentes
      currentYear.setHours(8, 0, 0, 0);
      
      if (currentYear > now) {
        return currentYear;
      }

      // Próximo ano
      const nextYear = new Date(now.getFullYear() + interval, month, dayOfMonth);
      // Sempre usar 8h da manhã para tarefas recorrentes
      nextYear.setHours(8, 0, 0, 0);
      
      return nextYear;
    }

    return null;
  }

  /**
   * Cria uma nova tarefa baseada na tarefa recorrente
   */
  private async createRecurrentTask(
    parentTask: InternalTask,
    nextDueDate: Date,
    customer?: Company,
  ): Promise<InternalTask> {
    // Buscar a primeira coluna do kanban (ou a coluna padrão)
    const firstColumn = await this.columnRepository.findOne({
      where: { kanban: { id: parentTask.kanban.id } },
      order: { order: 'ASC' },
    });

    if (!firstColumn) {
      throw new Error(`Não foi possível encontrar coluna para o kanban ${parentTask.kanban.id}`);
    }

    // Usar o customer passado ou o customer da tarefa pai
    const taskCustomer = customer || parentTask.customer;

    // Criar nova tarefa
    const newTask = this.taskRepository.create({
      title: parentTask.title,
      description: parentTask.description,
      priority: parentTask.priority,
      startDate: parentTask.startDate ? this.addDays(parentTask.startDate, this.getDaysDifference(parentTask.dueDate || parentTask.createdAt, nextDueDate)) : null,
      dueDate: nextDueDate,
      // Sempre usar 8h da manhã para tarefas recorrentes geradas
      scheduledDate: (() => {
        const scheduled = new Date(nextDueDate);
        scheduled.setHours(8, 0, 0, 0);
        return scheduled;
      })(),
      customer: taskCustomer,
      department: parentTask.department,
      responsible: parentTask.responsible,
      coResponsible: parentTask.coResponsible,
      assistants: parentTask.assistants,
      kanban: parentTask.kanban,
      column: firstColumn,
      order: 0,
      checklist: parentTask.checklist,
      service: parentTask.service,
      createdBy: parentTask.createdBy,
      // Campos de recorrência - a tarefa gerada NÃO é recorrente
      isRecurrent: false,
      parentRecurrentTaskId: parentTask.id, // Rastrear origem
      isGlobalRecurrent: false,
    });

    const savedTask = await this.taskRepository.save(newTask);
    this.logger.log(`Tarefa recorrente criada: ${savedTask.id} - ${savedTask.title} para cliente ${taskCustomer.name}`);
    
    return savedTask;
  }

  /**
   * Adiciona dias a uma data
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Calcula diferença em dias entre duas datas
   */
  private getDaysDifference(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se a recorrência ainda está ativa
   */
  private isRecurrenceActive(task: InternalTask, currentDate: Date): boolean {
    // Se tem data de término e já passou
    if (task.recurrenceEndDate && new Date(task.recurrenceEndDate) < currentDate) {
      return false;
    }

    // Se a tarefa foi deletada
    if (task.deletedAt) {
      return false;
    }

    return task.isRecurrent === true && task.recurrenceType !== null;
  }

  /**
   * Job que roda a cada hora para verificar e criar tarefas recorrentes
   */
  @Cron('0 * * * *') // A cada hora
  async handle(): Promise<void> {
    const now = new Date();
    this.logger.debug(`Verificando tarefas recorrentes às ${now.toISOString()}`);

    try {
      // Buscar todas as tarefas recorrentes ativas
      const recurrentTasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.customer', 'customer')
        .leftJoinAndSelect('task.department', 'department')
        .leftJoinAndSelect('task.responsible', 'responsible')
        .leftJoinAndSelect('task.coResponsible', 'coResponsible')
        .leftJoinAndSelect('task.assistants', 'assistants')
        .leftJoinAndSelect('task.kanban', 'kanban')
        .leftJoinAndSelect('task.column', 'column')
        .leftJoinAndSelect('task.checklist', 'checklist')
        .leftJoinAndSelect('task.service', 'service')
        .leftJoinAndSelect('task.createdBy', 'createdBy')
        .where('task.isRecurrent = :isRecurrent', { isRecurrent: true })
        .andWhere('task.deletedAt IS NULL')
        .getMany();

      this.logger.debug(`Encontradas ${recurrentTasks.length} tarefas recorrentes`);

      for (const task of recurrentTasks) {
        if (!this.isRecurrenceActive(task, now)) {
          continue;
        }

        try {
          // Se não tem próxima data, calcula
          if (!task.nextRecurrenceDate) {
            const nextDate = this.calculateNextRecurrenceDate(task, task.dueDate || task.startDate || task.createdAt);
            if (nextDate) {
              task.nextRecurrenceDate = nextDate;
              await this.taskRepository.save(task);
            }
            continue;
          }

          // Se a próxima data já chegou, cria a tarefa
          if (new Date(task.nextRecurrenceDate) <= now) {
            // Se é tarefa global, cria para todos os clientes
            if (task.isGlobalRecurrent) {
              // Buscar todos os clientes ativos
              const allCustomers = await this.companyRepository.find({
                where: { deletedAt: IsNull() },
              });

              this.logger.log(`Criando tarefas globais para ${allCustomers.length} clientes`);

              // Criar uma tarefa para cada cliente
              for (const customer of allCustomers) {
                try {
                  await this.createRecurrentTask(task, new Date(task.nextRecurrenceDate), customer);
                } catch (error) {
                  this.logger.error(`Erro ao criar tarefa para cliente ${customer.name}:`, error);
                }
              }
            } else {
              // Tarefa normal (um cliente específico)
              await this.createRecurrentTask(task, new Date(task.nextRecurrenceDate));
            }

            // Atualiza a tarefa pai
            task.lastRecurrenceDate = new Date(task.nextRecurrenceDate);
            task.nextRecurrenceDate = this.calculateNextRecurrenceDate(task, new Date(task.nextRecurrenceDate));

            // Se não há próxima data ou passou da data de término, desativa
            if (!task.nextRecurrenceDate || (task.recurrenceEndDate && task.nextRecurrenceDate > task.recurrenceEndDate)) {
              task.isRecurrent = false;
              this.logger.log(`Recorrência desativada para tarefa ${task.id} - ${task.title}`);
            }

            await this.taskRepository.save(task);
            this.logger.log(`Tarefa(s) recorrente(s) gerada(s) de ${task.id}`);
          }
        } catch (error) {
          this.logger.error(`Erro ao processar recorrência da tarefa ${task.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Erro no job de recorrência:', error);
    }
  }
}

