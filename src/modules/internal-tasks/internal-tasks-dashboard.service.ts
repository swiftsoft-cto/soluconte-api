import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalTask } from './entities/internal-task.entity';
import { TaskColumn } from './entities/task-column.entity';
import { TaskTimeEntry } from './entities/task-time-entry.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/companies.entity';

export interface TaskDashboardFilters {
  customerId?: string;
  departmentId?: string;
  priority?: string;
  responsibleId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TaskDashboardMetrics {
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overduePercentage: number;
  completionRate: number;
}

export interface OverdueTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: Date;
  daysOverdue: number;
  customer: {
    id: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
  };
  responsible: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  createdAt: Date;
}

export interface CompletedTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  completedAt: Date;
  customer: {
    id: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
  };
  responsible: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  createdAt: Date;
  validatedAt?: Date;
  validatedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CustomerTaskRanking {
  customer: {
    id: string;
    name: string;
  };
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averageExecutionTime: number; // em segundos
}

export interface EmployeeTaskCount {
  user: {
    id: string;
    name: string;
    email: string;
  };
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface TaskExecutionTimeStats {
  taskId: string;
  taskTitle: string;
  customerName: string;
  averageExecutionTime: number; // em segundos
  totalTimeWorked: number; // em segundos
  entriesCount: number;
  completed: boolean;
}

export interface EmployeeScreenTime {
  user: {
    id: string;
    name: string;
    email: string;
  };
  totalScreenTime: number; // em segundos - soma de todos os cronômetros ativos + pausados
  activeTimerTime: number; // em segundos - tempo de cronômetros ainda rodando
  tasksCount: number; // número de tarefas trabalhadas
  averageTimePerTask: number; // em segundos
}

export interface UserSessionStats {
  user: {
    id: string;
    name: string;
    email: string;
  };
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  isOnline: boolean; // Se lastActivityAt foi nos últimos 15 minutos
  sessionDuration: number; // Tempo desde último login até agora (em segundos)
  activeTime: number; // Tempo desde último login até última atividade (em segundos)
  idleTime: number; // Tempo desde última atividade até agora (em segundos)
}

@Injectable()
export class InternalTasksDashboardService {
  constructor(
    @InjectRepository(InternalTask)
    private taskRepository: Repository<InternalTask>,
    @InjectRepository(TaskColumn)
    private columnRepository: Repository<TaskColumn>,
    @InjectRepository(TaskTimeEntry)
    private timeEntryRepository: Repository<TaskTimeEntry>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getDashboardMetrics(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<TaskDashboardMetrics> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoin('task.createdBy', 'createdBy'); // Join para filtro de permissão

    // Aplicar filtros
    this.applyFilters(queryBuilder, filters, currentUser);

    const tasks = await queryBuilder.getMany();
    const now = new Date();

    // Buscar coluna de conclusão "Feito"
    const completedColumns = await this.columnRepository
      .createQueryBuilder('column')
      .where('column.name = :name', {
        name: 'Feito'
      })
      .getMany();

    const completedColumnIds = completedColumns.map(col => col.id);

    const totalTasks = tasks.length;
    const overdueTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      !completedColumnIds.includes(task.column.id)
    ).length;
    const completedTasks = tasks.filter(task => completedColumnIds.includes(task.column.id)).length;
    const pendingTasks = tasks.filter(task => 
      task.column.name.toLowerCase().includes('pendente') || 
      task.column.name.toLowerCase().includes('to do') ||
      task.column.name.toLowerCase().includes('backlog')
    ).length;
    const inProgressTasks = tasks.filter(task => 
      task.column.name.toLowerCase().includes('andamento') || 
      task.column.name.toLowerCase().includes('progress') ||
      task.column.name.toLowerCase().includes('doing')
    ).length;

    const overduePercentage = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      overdueTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overduePercentage: Math.round(overduePercentage * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  async getOverdueTasks(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<OverdueTask[]> {
    // Buscar coluna de conclusão "Feito"
    const completedColumns = await this.columnRepository
      .createQueryBuilder('column')
      .where('column.name = :name', {
        name: 'Feito'
      })
      .getMany();

    const completedColumnIds = completedColumns.map(col => col.id);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoin('task.createdBy', 'createdBy') // Join para filtro de permissão
      .where('task.dueDate < :now', { now: new Date() })
      .andWhere('task.column.id NOT IN (:...completedColumnIds)', { completedColumnIds })
      .orderBy('task.dueDate', 'ASC');

    // Aplicar filtros
    this.applyFilters(queryBuilder, filters, currentUser);

    const tasks = await queryBuilder.getMany();
    const now = new Date();

    return tasks.map(task => {
      const dueDate = new Date(task.dueDate);
      const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: dueDate,
        daysOverdue,
        customer: {
          id: task.customer?.id || '',
          name: task.customer?.name || 'N/A',
        },
        department: {
          id: task.department?.id || '',
          name: task.department?.name || 'N/A',
        },
        responsible: {
          id: task.responsible?.id || '',
          name: task.responsible?.name || 'N/A',
          email: task.responsible?.email || 'N/A',
        },
        status: task.column?.name || 'N/A',
        createdAt: task.createdAt,
      };
    });
  }

  async getCompletedTasks(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<CompletedTask[]> {
    // Buscar coluna de conclusão "Feito"
    const completedColumns = await this.columnRepository
      .createQueryBuilder('column')
      .where('column.name = :name', {
        name: 'Feito'
      })
      .getMany();

    const completedColumnIds = completedColumns.map(col => col.id);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoin('task.createdBy', 'createdBy') // Join para filtro de permissão
      .where('task.column.id IN (:...completedColumnIds)', { completedColumnIds })
      .orderBy('task.updatedAt', 'DESC');

    // Aplicar filtros
    this.applyFilters(queryBuilder, filters, currentUser);

    const tasks = await queryBuilder.getMany();

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      completedAt: task.updatedAt, // Usar updatedAt como data de conclusão
      customer: {
        id: task.customer?.id || '',
        name: task.customer?.name || 'N/A',
      },
      department: {
        id: task.department?.id || '',
        name: task.department?.name || 'N/A',
      },
      responsible: {
        id: task.responsible?.id || '',
        name: task.responsible?.name || 'N/A',
        email: task.responsible?.email || 'N/A',
      },
      status: task.column?.name || 'N/A',
      createdAt: task.createdAt,
      validatedAt: undefined, // Campo não existe na entidade atual
      validatedBy: undefined, // Campo não existe na entidade atual
    }));
  }

  /**
   * Ranking de tarefas por cliente
   */
  async getCustomerTaskRanking(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<CustomerTaskRanking[]> {
    // Buscar coluna de conclusão "Feito"
    const completedColumns = await this.columnRepository
      .createQueryBuilder('column')
      .where('column.name = :name', {
        name: 'Feito'
      })
      .getMany();

    const completedColumnIds = completedColumns.map(col => col.id);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoinAndSelect('task.timeEntries', 'timeEntries')
      .leftJoin('task.createdBy', 'createdBy') // Join para filtro de permissão
      .leftJoin('task.department', 'department') // Join para filtro de permissão
      .leftJoin('task.responsible', 'responsible'); // Join para filtro de permissão

    // Aplicar filtros
    this.applyFilters(queryBuilder, filters, currentUser);

    const tasks = await queryBuilder.getMany();
    const now = new Date();

    // Agrupar por cliente
    const customerMap = new Map<string, CustomerTaskRanking>();

    for (const task of tasks) {
      const customerId = task.customer?.id || 'no-customer';
      const customerName = task.customer?.name || 'Sem Cliente';

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer: {
            id: customerId,
            name: customerName,
          },
          totalTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          averageExecutionTime: 0,
        });
      }

      const stats = customerMap.get(customerId)!;
      stats.totalTasks++;

      // Verificar status
      const isCompleted = completedColumnIds.includes(task.column?.id);
      const isOverdue = task.dueDate && new Date(task.dueDate) < now && !isCompleted;
      const isInProgress = task.column && 
        (task.column.name.toLowerCase().includes('andamento') || 
         task.column.name.toLowerCase().includes('progress') ||
         task.column.name.toLowerCase().includes('doing'));

      if (isCompleted) {
        stats.completedTasks++;
      } else if (isOverdue) {
        stats.overdueTasks++;
      } else if (isInProgress) {
        stats.inProgressTasks++;
      }

      // Acumular tempo total para calcular média depois
      if (task.timeEntries && task.timeEntries.length > 0) {
        const totalTime = task.timeEntries.reduce((sum, entry) => {
          if (entry.endTime) {
            return sum + entry.duration;
          } else {
            // Se ainda está rodando, calcular tempo até agora
            const start = new Date(entry.startTime).getTime();
            const current = now.getTime();
            return sum + Math.floor((current - start) / 1000);
          }
        }, 0);
        
        // Acumular tempo total (vamos calcular a média no final)
        if (!stats.averageExecutionTime) {
          stats.averageExecutionTime = 0;
        }
        // Usar uma propriedade temporária para acumular
        (stats as any).__totalTime = ((stats as any).__totalTime || 0) + totalTime;
        (stats as any).__tasksWithTime = ((stats as any).__tasksWithTime || 0) + 1;
      }
    }

    // Calcular médias finais
    for (const stats of customerMap.values()) {
      const totalTime = (stats as any).__totalTime || 0;
      const tasksWithTime = (stats as any).__tasksWithTime || 0;
      stats.averageExecutionTime = tasksWithTime > 0 ? Math.round(totalTime / tasksWithTime) : 0;
      // Remover propriedades temporárias
      delete (stats as any).__totalTime;
      delete (stats as any).__tasksWithTime;
    }

    return Array.from(customerMap.values()).sort((a, b) => b.totalTasks - a.totalTasks);
  }

  /**
   * Quantidade de tarefas por colaborador
   */
  async getEmployeeTaskCount(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<EmployeeTaskCount[]> {
    // Buscar coluna de conclusão "Feito"
    const completedColumns = await this.columnRepository
      .createQueryBuilder('column')
      .where('column.name = :name', {
        name: 'Feito'
      })
      .getMany();

    const completedColumnIds = completedColumns.map(col => col.id);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoin('task.createdBy', 'createdBy') // Join para filtro de permissão
      .leftJoin('task.department', 'department'); // Join para filtro de permissão

    // Aplicar filtros
    this.applyFilters(queryBuilder, filters, currentUser);

    const tasks = await queryBuilder.getMany();
    const now = new Date();

    // Agrupar por colaborador (responsible)
    const userMap = new Map<string, EmployeeTaskCount>();

    for (const task of tasks) {
      if (!task.responsible) continue;

      const userId = task.responsible.id;
      const userName = task.responsible.name || 'Sem Nome';
      const userEmail = task.responsible.email || '';

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: {
            id: userId,
            name: userName,
            email: userEmail,
          },
          totalTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
        });
      }

      const stats = userMap.get(userId)!;
      stats.totalTasks++;

      // Verificar status
      const isCompleted = completedColumnIds.includes(task.column?.id);
      const isOverdue = task.dueDate && new Date(task.dueDate) < now && !isCompleted;
      const isInProgress = task.column && 
        (task.column.name.toLowerCase().includes('andamento') || 
         task.column.name.toLowerCase().includes('progress') ||
         task.column.name.toLowerCase().includes('doing'));

      if (isCompleted) {
        stats.completedTasks++;
      } else if (isOverdue) {
        stats.overdueTasks++;
      } else if (isInProgress) {
        stats.inProgressTasks++;
      }
    }

    return Array.from(userMap.values()).sort((a, b) => b.totalTasks - a.totalTasks);
  }

  /**
   * Tempo médio de execução por tarefa
   */
  async getTaskExecutionTimeStats(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<TaskExecutionTimeStats[]> {
    // Buscar coluna de conclusão "Feito"
    const completedColumns = await this.columnRepository
      .createQueryBuilder('column')
      .where('column.name = :name', {
        name: 'Feito'
      })
      .getMany();

    const completedColumnIds = completedColumns.map(col => col.id);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoinAndSelect('task.timeEntries', 'timeEntries')
      .leftJoin('task.createdBy', 'createdBy') // Join para filtro de permissão
      .leftJoin('task.department', 'department') // Join para filtro de permissão
      .leftJoin('task.responsible', 'responsible'); // Join para filtro de permissão

    // Aplicar filtros
    this.applyFilters(queryBuilder, filters, currentUser);

    const tasks = await queryBuilder.getMany();
    const now = new Date();

    // Filtrar apenas tarefas com entradas de tempo
    const tasksWithTime = tasks.filter(task => task.timeEntries && task.timeEntries.length > 0);

    return tasksWithTime.map(task => {
      let totalTime = 0;
      let entriesCount = 0;

      if (task.timeEntries && task.timeEntries.length > 0) {
        entriesCount = task.timeEntries.length;
        totalTime = task.timeEntries.reduce((sum, entry) => {
          if (entry.endTime) {
            return sum + entry.duration;
          } else {
            // Se ainda está rodando, calcular tempo até agora
            const start = new Date(entry.startTime).getTime();
            const current = now.getTime();
            return sum + Math.floor((current - start) / 1000);
          }
        }, 0);
      }

      const averageTime = entriesCount > 0 ? totalTime / entriesCount : 0;
      const isCompleted = completedColumnIds.includes(task.column?.id);

      return {
        taskId: task.id,
        taskTitle: task.title,
        customerName: task.customer?.name || 'Sem Cliente',
        averageExecutionTime: Math.round(averageTime),
        totalTimeWorked: totalTime,
        entriesCount,
        completed: isCompleted,
      };
    }).sort((a, b) => b.totalTimeWorked - a.totalTimeWorked);
  }

  /**
   * Tempo de tela por colaborador (soma de todos os cronômetros)
   */
  async getEmployeeScreenTime(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<EmployeeScreenTime[]> {
    const now = new Date();

    // Buscar todas as entradas de tempo com relacionamentos
    const queryBuilder = this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.task', 'task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible');

    // Aplicar filtros de data se fornecidos
    if (filters.startDate) {
      queryBuilder.andWhere('entry.startTime >= :startDate', { 
        startDate: new Date(filters.startDate) 
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('entry.startTime <= :endDate', { 
        endDate: new Date(`${filters.endDate}T23:59:59.999Z`) 
      });
    }

    // Filtrar por cliente se fornecido
    if (filters.customerId) {
      queryBuilder.andWhere('task.customer.id = :customerId', { customerId: filters.customerId });
    }

    // Filtrar por departamento se fornecido
    if (filters.departmentId) {
      queryBuilder.andWhere('task.department.id = :departmentId', { departmentId: filters.departmentId });
    }

    // Filtrar por responsável se fornecido
    if (filters.responsibleId) {
      queryBuilder.andWhere('entry.user.id = :responsibleId', { responsibleId: filters.responsibleId });
    }

    // Aplicar filtros de permissão se o usuário não for administrador
    if (currentUser) {
      const isAdmin = currentUser.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) => roleRule.rule?.rule === 'administrator',
        ),
      );

      // Se não for administrador, filtrar apenas entradas do próprio usuário
      if (!isAdmin) {
        queryBuilder.andWhere('entry.user.id = :userId', { userId: currentUser.id });
      }
    }

    const entries = await queryBuilder.getMany();

    // Agrupar por usuário
    const userMap = new Map<string, EmployeeScreenTime>();

    for (const entry of entries) {
      if (!entry.user) continue;

      const userId = entry.user.id;
      const userName = entry.user.name || 'Sem Nome';
      const userEmail = entry.user.email || '';

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: {
            id: userId,
            name: userName,
            email: userEmail,
          },
          totalScreenTime: 0,
          activeTimerTime: 0,
          tasksCount: 0,
          averageTimePerTask: 0,
        });
      }

      const stats = userMap.get(userId)!;
      const taskId = entry.task?.id;

      // Contar tarefas únicas
      if (taskId && !stats.tasksCount) {
        // Vamos contar depois
      }

      // Adicionar tempo total
      if (entry.endTime) {
        // Entrada finalizada
        stats.totalScreenTime += entry.duration;
      } else {
        // Entrada ainda ativa (cronômetro rodando ou pausado)
        const start = new Date(entry.startTime).getTime();
        const current = now.getTime();
        const elapsedSeconds = Math.floor((current - start) / 1000);
        stats.totalScreenTime += entry.duration + elapsedSeconds;
        stats.activeTimerTime += elapsedSeconds; // Tempo atual do cronômetro ativo
      }
    }

    // Contar tarefas únicas por usuário
    const userTasksMap = new Map<string, Set<string>>();
    for (const entry of entries) {
      if (!entry.user || !entry.task) continue;
      const userId = entry.user.id;
      const taskId = entry.task.id;
      
      if (!userTasksMap.has(userId)) {
        userTasksMap.set(userId, new Set());
      }
      userTasksMap.get(userId)!.add(taskId);
    }

    // Atualizar contagem de tarefas e média
    for (const [userId, stats] of userMap.entries()) {
      const tasksSet = userTasksMap.get(userId);
      stats.tasksCount = tasksSet ? tasksSet.size : 0;
      stats.averageTimePerTask = stats.tasksCount > 0 
        ? Math.round(stats.totalScreenTime / stats.tasksCount) 
        : 0;
    }

    return Array.from(userMap.values()).sort((a, b) => b.totalScreenTime - a.totalScreenTime);
  }

  /**
   * Estatísticas de sessão dos usuários (tempo logado)
   */
  async getUserSessionStats(filters: TaskDashboardFilters = {}, currentUser?: User): Promise<UserSessionStats[]> {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutos atrás

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt IS NOT NULL'); // Apenas usuários que já fizeram login

    // Filtrar por usuário específico se fornecido
    if (filters.responsibleId) {
      queryBuilder.andWhere('user.id = :responsibleId', { responsibleId: filters.responsibleId });
    }

    // Aplicar filtros de permissão se o usuário não for administrador
    if (currentUser) {
      const isAdmin = currentUser.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) => roleRule.rule?.rule === 'administrator',
        ),
      );

      // Se não for administrador, mostrar apenas dados do próprio usuário
      if (!isAdmin) {
        queryBuilder.andWhere('user.id = :userId', { userId: currentUser.id });
      }
    }

    const users = await queryBuilder.getMany();

    return users.map(user => {
      const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
      const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt) : null;

      // Calcular tempos
      let sessionDuration = 0; // Tempo desde login até agora
      let activeTime = 0; // Tempo desde login até última atividade
      let idleTime = 0; // Tempo desde última atividade até agora

      if (lastLogin) {
        sessionDuration = Math.floor((now.getTime() - lastLogin.getTime()) / 1000);

        if (lastActivity) {
          activeTime = Math.floor((lastActivity.getTime() - lastLogin.getTime()) / 1000);
          idleTime = Math.floor((now.getTime() - lastActivity.getTime()) / 1000);
        } else {
          // Se não tem última atividade, assume que está ativo desde o login
          activeTime = sessionDuration;
          idleTime = 0;
        }
      }

      // Considerar online se última atividade foi nos últimos 15 minutos
      const isOnline = lastActivity ? lastActivity >= fifteenMinutesAgo : false;

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        lastLoginAt: lastLogin || undefined,
        lastActivityAt: lastActivity || undefined,
        isOnline,
        sessionDuration,
        activeTime,
        idleTime,
      };
    }).sort((a, b) => {
      // Ordenar: online primeiro, depois por última atividade (mais recente primeiro)
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      const aTime = a.lastActivityAt?.getTime() || 0;
      const bTime = b.lastActivityAt?.getTime() || 0;
      return bTime - aTime;
    });
  }

  private applyFilters(queryBuilder: any, filters: TaskDashboardFilters, currentUser?: User): void {
    // Aplicar filtros de permissão se o usuário não for administrador
    if (currentUser) {
      const isAdmin = currentUser.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) => roleRule.rule?.rule === 'administrator',
        ),
      );

      // Se não for administrador, aplicar filtros de visibilidade por departamento
      if (!isAdmin) {
        const userDepartments =
          currentUser.userRoles?.flatMap(
            (userRole) =>
              userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
          ) || [];

        // Filtrar apenas tarefas dos departamentos que o usuário tem acesso
        // OU tarefas onde ele é responsável OU tarefas criadas por ele
        if (userDepartments.length > 0) {
          queryBuilder.andWhere(
            '(task.department.id IN (:...userDepartments) OR task.responsible.id = :userId OR task.createdBy.id = :userId)',
            {
              userDepartments,
              userId: currentUser.id,
            },
          );
        } else {
          // Se não tem acesso a nenhum departamento, ver apenas suas próprias tarefas
          queryBuilder.andWhere(
            '(task.responsible.id = :userId OR task.createdBy.id = :userId)',
            {
              userId: currentUser.id,
            },
          );
        }
      }
      // Se for administrador, não aplica filtros de permissão (vê tudo)
    }

    // Aplicar filtros opcionais fornecidos
    if (filters.customerId) {
      queryBuilder.andWhere('task.customer.id = :customerId', { customerId: filters.customerId });
    }

    if (filters.departmentId) {
      queryBuilder.andWhere('task.department.id = :departmentId', { departmentId: filters.departmentId });
    }

    if (filters.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.responsibleId) {
      queryBuilder.andWhere('task.responsible.id = :responsibleId', { responsibleId: filters.responsibleId });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', { endDate: new Date(`${filters.endDate}T23:59:59.999Z`) });
    }
  }
}
