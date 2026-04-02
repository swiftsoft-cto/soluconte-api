import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { 
  InternalTasksDashboardService, 
  TaskDashboardFilters, 
  TaskDashboardMetrics, 
  OverdueTask, 
  CompletedTask,
  CustomerTaskRanking,
  EmployeeTaskCount,
  TaskExecutionTimeStats,
  EmployeeScreenTime,
  UserSessionStats,
} from './internal-tasks-dashboard.service';

@ApiTags('Internal Tasks Dashboard')
@Controller('api/internal-tasks/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InternalTasksDashboardController {
  constructor(
    private readonly dashboardService: InternalTasksDashboardService,
  ) {}

  /**
   * Verifica se o usuário é administrador/CEO
   */
  private isAdministrator(user: User): boolean {
    return user.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    ) || false;
  }

  /**
   * Aplica filtros de permissão baseados no tipo de usuário
   * Usuários comuns sempre terão visão individual (apenas dados deles)
   */
  private applyPermissionFilters(
    filters: TaskDashboardFilters,
    currentUser: User,
  ): TaskDashboardFilters {
    const isAdmin = this.isAdministrator(currentUser);

    // Se não for administrador, forçar visão individual
    if (!isAdmin) {
      // Sempre filtrar por responsibleId do usuário atual
      filters.responsibleId = currentUser.id;
    }
    // Se for administrador, manter o responsibleId se fornecido (permite visão individual ou geral)

    return filters;
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Obter métricas gerais do dashboard de tarefas' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Prioridade da tarefa' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Métricas do dashboard retornadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalTasks: { type: 'number', example: 150 },
        overdueTasks: { type: 'number', example: 12 },
        completedTasks: { type: 'number', example: 98 },
        pendingTasks: { type: 'number', example: 25 },
        inProgressTasks: { type: 'number', example: 15 },
        overduePercentage: { type: 'number', example: 8.0 },
        completionRate: { type: 'number', example: 65.33 },
      },
    },
  })
  async getMetrics(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TaskDashboardMetrics> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      priority,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getDashboardMetrics(filteredFilters, req.user);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Obter tarefas em atraso' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Prioridade da tarefa' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tarefas em atraso retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          title: { type: 'string', example: 'Implementar nova funcionalidade' },
          description: { type: 'string', example: 'Descrição da tarefa' },
          priority: { type: 'string', example: 'HIGH' },
          dueDate: { type: 'string', format: 'date-time' },
          daysOverdue: { type: 'number', example: 5 },
          customer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          department: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          responsible: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          status: { type: 'string', example: 'IN_PROGRESS' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getOverdueTasks(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<OverdueTask[]> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      priority,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getOverdueTasks(filteredFilters, req.user);
  }

  @Get('completed')
  @ApiOperation({ summary: 'Obter tarefas concluídas' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Prioridade da tarefa' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tarefas concluídas retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          title: { type: 'string', example: 'Implementar nova funcionalidade' },
          description: { type: 'string', example: 'Descrição da tarefa' },
          priority: { type: 'string', example: 'HIGH' },
          completedAt: { type: 'string', format: 'date-time' },
          customer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          department: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          responsible: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          status: { type: 'string', example: 'COMPLETED' },
          createdAt: { type: 'string', format: 'date-time' },
          validatedAt: { type: 'string', format: 'date-time' },
          validatedBy: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getCompletedTasks(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CompletedTask[]> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      priority,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getCompletedTasks(filteredFilters, req.user);
  }

  @Get('customer-ranking')
  @ApiOperation({ summary: 'Obter ranking de tarefas por cliente' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Prioridade da tarefa' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável (para visão individual)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Ranking de tarefas por cliente retornado com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          customer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          totalTasks: { type: 'number' },
          inProgressTasks: { type: 'number' },
          completedTasks: { type: 'number' },
          overdueTasks: { type: 'number' },
          averageExecutionTime: { type: 'number', description: 'Tempo médio em segundos' },
        },
      },
    },
  })
  async getCustomerRanking(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CustomerTaskRanking[]> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      priority,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getCustomerTaskRanking(filteredFilters, req.user);
  }

  @Get('employee-task-count')
  @ApiOperation({ summary: 'Obter quantidade de tarefas por colaborador' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Prioridade da tarefa' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável (para visão individual)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Quantidade de tarefas por colaborador retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          totalTasks: { type: 'number' },
          inProgressTasks: { type: 'number' },
          completedTasks: { type: 'number' },
          overdueTasks: { type: 'number' },
        },
      },
    },
  })
  async getEmployeeTaskCount(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EmployeeTaskCount[]> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      priority,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getEmployeeTaskCount(filteredFilters, req.user);
  }

  @Get('task-execution-time')
  @ApiOperation({ summary: 'Obter tempo médio de execução por tarefa' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Prioridade da tarefa' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável (para visão individual)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Tempo médio de execução por tarefa retornado com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          taskTitle: { type: 'string' },
          customerName: { type: 'string' },
          averageExecutionTime: { type: 'number', description: 'Tempo médio em segundos' },
          totalTimeWorked: { type: 'number', description: 'Tempo total em segundos' },
          entriesCount: { type: 'number' },
          completed: { type: 'boolean' },
        },
      },
    },
  })
  async getTaskExecutionTime(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('priority') priority?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TaskExecutionTimeStats[]> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      priority,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getTaskExecutionTimeStats(filteredFilters, req.user);
  }

  @Get('employee-screen-time')
  @ApiOperation({ summary: 'Obter tempo de tela por colaborador' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'ID do cliente' })
  @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'ID do departamento' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável (para visão individual)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Tempo de tela por colaborador retornado com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          totalScreenTime: { type: 'number', description: 'Tempo total em segundos' },
          activeTimerTime: { type: 'number', description: 'Tempo de cronômetros ativos em segundos' },
          tasksCount: { type: 'number' },
          averageTimePerTask: { type: 'number', description: 'Tempo médio por tarefa em segundos' },
        },
      },
    },
  })
  async getEmployeeScreenTime(
    @Request() req: { user: User },
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EmployeeScreenTime[]> {
    const filters: TaskDashboardFilters = {
      customerId,
      departmentId,
      responsibleId,
      startDate,
      endDate,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getEmployeeScreenTime(filteredFilters, req.user);
  }

  @Get('user-session-stats')
  @ApiOperation({ summary: 'Obter estatísticas de sessão dos usuários (tempo logado)' })
  @ApiQuery({ name: 'responsibleId', required: false, type: String, description: 'ID do responsável (para visão individual)' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de sessão dos usuários retornadas com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          lastLoginAt: { type: 'string', format: 'date-time' },
          lastActivityAt: { type: 'string', format: 'date-time' },
          isOnline: { type: 'boolean', description: 'Se última atividade foi nos últimos 15 minutos' },
          sessionDuration: { type: 'number', description: 'Tempo desde login até agora em segundos' },
          activeTime: { type: 'number', description: 'Tempo desde login até última atividade em segundos' },
          idleTime: { type: 'number', description: 'Tempo desde última atividade até agora em segundos' },
        },
      },
    },
  })
  async getUserSessionStats(
    @Request() req: { user: User },
    @Query('responsibleId') responsibleId?: string,
  ): Promise<UserSessionStats[]> {
    const filters: TaskDashboardFilters = {
      responsibleId,
    };

    // Aplicar filtros de permissão (usuários comuns sempre veem apenas seus dados)
    const filteredFilters = this.applyPermissionFilters(filters, req.user);

    return this.dashboardService.getUserSessionStats(filteredFilters, req.user);
  }
}









