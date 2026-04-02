import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import {
  InternalTask,
  InternalTaskRecurrenceType,
} from './entities/internal-task.entity';
import { TaskKanban } from './entities/task-kanban.entity';
import { TaskColumn } from './entities/task-column.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { Checklist } from './entities/checklist.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { TaskTimeEntry } from './entities/task-time-entry.entity';
import { StorageService } from '../storage/storage.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { CreateKanbanDto } from './dtos/create-kanban.dto';
import { CreateColumnDto } from './dtos/create-column.dto';
import { UpdateColumnDto } from './dtos/update-column.dto';
import {
  StartTimeDto,
  StopTimeDto,
  PauseTimeDto,
  ResumeTimeDto,
  TaskTimeStatsDto,
  TaskTimeEntryDto,
} from './dtos/task-time.dto';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/departments.entiy';
import { Company } from '../companies/entities/companies.entity';
import { Service } from '../services/entities/services.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationStatus,
} from '../notifications/entities/notification.entity';

@Injectable()
export class InternalTasksService {
  constructor(
    @InjectRepository(InternalTask)
    private readonly taskRepository: Repository<InternalTask>,
    @InjectRepository(TaskKanban)
    private readonly kanbanRepository: Repository<TaskKanban>,
    @InjectRepository(TaskColumn)
    private readonly columnRepository: Repository<TaskColumn>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepository: Repository<TaskAttachment>,
    @InjectRepository(Checklist)
    private readonly checklistRepository: Repository<Checklist>,
    @InjectRepository(TaskChecklistItem)
    private readonly taskChecklistItemRepository: Repository<TaskChecklistItem>,
    @InjectRepository(TaskTimeEntry)
    private readonly timeEntryRepository: Repository<TaskTimeEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================== TAREFAS ==============================
  async findTemplates(_currentUser: User): Promise<InternalTask[]> {
    // usar a variável para evitar warning de linter
    if (!_currentUser) {
      // no-op
    }
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.checklist', 'checklist')
      .leftJoinAndSelect('task.assistants', 'assistants')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .where('task.isTemplate = :isTemplate', { isTemplate: true });

    // TODO: aplicar escopo (personal/company/global) quando houver mapeamento de empresa do usuário
    return qb.orderBy('task.updatedAt', 'DESC').getMany();
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    currentUser: User,
  ): Promise<InternalTask> {
    const {
      customerId,
      departmentId,
      responsibleId,
      coResponsibleId,
      assistantIds,
      kanbanId,
      columnId,
      checklistId,
      serviceId,
      ...taskData
    } = createTaskDto;

    // Verificar se o usuário tem permissão para criar tarefas no departamento
    await this.checkDepartmentPermission(currentUser, departmentId);

    // Buscar entidades relacionadas
    // Customer é opcional agora
    let customer: Company | null = null;
    if (customerId && customerId.trim() !== '') {
      customer = await this.companyRepository.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }
    }
    
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });
    
    // Responsible é opcional agora (pode ser null para departamento)
    let responsible: User | null = null;
    if (responsibleId) {
      responsible = await this.userRepository.findOne({
        where: { id: responsibleId },
      });
    }
    
    const kanban = await this.kanbanRepository.findOne({
      where: { id: kanbanId },
    });
    const column = await this.columnRepository.findOne({
      where: { id: columnId },
    });

    if (!department || !kanban || !column) {
      throw new NotFoundException('Entidade relacionada não encontrada');
    }

    // Buscar corresponsável se fornecido
    let coResponsible: User | null = null;
    if (coResponsibleId) {
      coResponsible = await this.userRepository.findOne({
        where: { id: coResponsibleId },
      });
    }

    // Buscar serviço se fornecido
    let service: Service | null = null;
    if (serviceId) {
      service = await this.serviceRepository.findOne({
        where: { id: serviceId },
      });
    }

    // Buscar auxiliares se fornecidos
    let assistants: User[] = [];
    if (assistantIds && assistantIds.length > 0) {
      assistants = await this.userRepository.find({
        where: { id: In(assistantIds) },
      });
    }

    // Obter a maior ordem da coluna
    const maxOrder = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.column', 'column')
      .where('column.id = :columnId', { columnId })
      .select('MAX(task.order)', 'maxOrder')
      .getRawOne();

    const order = (maxOrder?.maxOrder || 0) + 1;

    // Buscar checklist se fornecido
    let checklist: Checklist | null = null;
    if (checklistId) {
      console.log('🔍 Debug - ChecklistId fornecido:', checklistId);
      checklist = await this.checklistRepository.findOne({
        where: { id: checklistId },
        relations: ['items'],
      });
      if (!checklist) {
        throw new NotFoundException('Checklist não encontrado');
      }
      console.log(
        '🔍 Debug - Checklist encontrado:',
        checklist.id,
        'com',
        checklist.items?.length,
        'itens',
      );
    } else {
      console.log('🔍 Debug - Nenhum checklist fornecido');
    }

    // Se veio templateId, carregar e aplicar defaults do template
    let template: InternalTask | null = null;
    if (taskData.templateId) {
      template = await this.taskRepository.findOne({
        where: { id: taskData.templateId, isTemplate: true },
        relations: ['checklist', 'assistants', 'responsible', 'coResponsible', 'service'],
      });
      if (!template) throw new NotFoundException('Template não encontrado');
    }

    const task = this.taskRepository.create({
      title: taskData.title ?? template?.title,
      description: taskData.description ?? template?.description,
      priority: (taskData as any).priority ?? template?.priority ?? 'MEDIUM',
      // Datas nunca herdadas de template
      startDate: taskData.startDate as any,
      dueDate: taskData.dueDate as any,
      scheduledDate: taskData.scheduledDate as any,
      // Relacionamentos (herdar se não vier no payload)
      customer: customer ?? template?.customer ?? null,
      department,
      responsible: responsible ?? template?.responsible ?? null,
      coResponsible: coResponsible ?? template?.coResponsible ?? null,
      assistants: assistants?.length ? assistants : template?.assistants ?? [],
      kanban,
      column,
      // Checklist: se não veio checklistId e template tem, usar o do template
      checklist: checklist ?? template?.checklist ?? null,
      service: service ?? template?.service ?? null,
      order,
      createdBy: currentUser,
      // Flags de template para salvar template (não para tarefa clonada)
      isTemplate: taskData.isTemplate ?? false,
      templateName: taskData.templateName,
      templateDescription: taskData.templateDescription,
      templateScope: (taskData as any).templateScope,
      createdFromTemplateId: template ? template.id : undefined,
    });

    // Calcular próxima data de recorrência se for tarefa recorrente
    if (task.isRecurrent && task.recurrenceType) {
      task.nextRecurrenceDate = this.calculateNextRecurrenceDate(
        task,
        task.dueDate || task.startDate || new Date(),
      );
    }

    const savedTask = await this.taskRepository.save(task);

    console.log('🔍 Debug - Tarefa salva com ID:', savedTask.id);

    // Criar itens de checklist para a tarefa se checklist foi fornecido
    if (checklist && checklist.items) {
      console.log(
        '🔍 Debug - Criando itens de checklist para tarefa:',
        savedTask.id,
      );
      console.log('🔍 Debug - Total de itens:', checklist.items.length);

      const taskChecklistItems = checklist.items.map((item) => {
        const taskChecklistItem = this.taskChecklistItemRepository.create({
          task: savedTask,
          checklistItem: item,
          isCompleted: false,
        });

        console.log('🔍 Debug - Item criado:', {
          taskId: taskChecklistItem.task?.id,
          checklistItemId: taskChecklistItem.checklistItem?.id,
        });

        return taskChecklistItem;
      });

      console.log('🔍 Debug - Salvando itens de checklist...');
      await this.taskChecklistItemRepository.save(taskChecklistItems);
      console.log('🔍 Debug - Itens de checklist salvos com sucesso');

      // Buscar a tarefa novamente com as relações para confirmar
      const taskWithChecklist = await this.taskRepository.findOne({
        where: { id: savedTask.id },
        relations: [
          'checklist',
          'checklistItems',
          'checklistItems.checklistItem',
        ],
      });

      console.log('🔍 Debug - Tarefa com checklist após salvamento:', {
        id: taskWithChecklist?.id,
        checklistId: taskWithChecklist?.checklist?.id,
        checklistItemsCount: taskWithChecklist?.checklistItems?.length,
      });
    }

    // Criar notificações para os usuários envolvidos
    await this.createTaskNotifications(savedTask);

    // Se é tarefa global recorrente, criar tarefas para todos os clientes imediatamente
    if (savedTask.isRecurrent && savedTask.isGlobalRecurrent && savedTask.dueDate) {
      await this.createTasksForAllCustomers(savedTask, savedTask.dueDate);
    }

    return savedTask;
  }

  /**
   * Cria tarefas para todos os clientes quando isGlobalRecurrent = true
   */
  private async createTasksForAllCustomers(parentTask: InternalTask, dueDate: Date): Promise<void> {
    // Buscar todos os clientes ativos
    const allCustomers = await this.companyRepository.find({
      where: { deletedAt: IsNull() },
    });

    // Filtrar para excluir o cliente da tarefa pai (se existir) - já que a tarefa pai já existe para ele
    const otherCustomers = parentTask.customer 
      ? allCustomers.filter(customer => customer.id !== parentTask.customer.id)
      : allCustomers;

    if (otherCustomers.length === 0) {
      return; // Não há outros clientes
    }

    // Buscar a primeira coluna do kanban
    const firstColumn = await this.columnRepository.findOne({
      where: { kanban: { id: parentTask.kanban.id } },
      order: { order: 'ASC' },
    });

    if (!firstColumn) {
      throw new Error(`Não foi possível encontrar coluna para o kanban ${parentTask.kanban.id}`);
    }

    // Criar uma tarefa para cada cliente (exceto o da tarefa pai)
    const tasksToCreate = otherCustomers.map(customer => {
      return this.taskRepository.create({
        title: parentTask.title,
        description: parentTask.description,
        priority: parentTask.priority,
        startDate: parentTask.startDate,
        dueDate: dueDate,
        scheduledDate: parentTask.scheduledDate,
        customer: customer,
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
        // Estas tarefas NÃO são recorrentes, apenas cópias da tarefa pai
        isRecurrent: false,
        parentRecurrentTaskId: parentTask.id, // Rastrear origem
        isGlobalRecurrent: false,
      });
    });

    // Salvar todas as tarefas
    const savedTasks = await this.taskRepository.save(tasksToCreate);

    // Criar itens de checklist para cada tarefa se houver checklist
    if (parentTask.checklist) {
      const checklistWithItems = await this.checklistRepository.findOne({
        where: { id: parentTask.checklist.id },
        relations: ['items'],
      });

      if (checklistWithItems && checklistWithItems.items) {
        for (const task of savedTasks) {
          const taskChecklistItems = checklistWithItems.items.map((item) => {
            return this.taskChecklistItemRepository.create({
              task: task,
              checklistItem: item,
              isCompleted: false,
            });
          });
          await this.taskChecklistItemRepository.save(taskChecklistItems);
        }
      }
    }

    // Criar notificações para cada tarefa criada
    for (const task of savedTasks) {
      await this.createTaskNotifications(task);
    }
  }

  async findAll(
    currentUser: User,
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      status?: string;
      priority?: string;
      customerId?: string;
      departmentId?: string;
      responsibleId?: string;
      kanbanId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{
    data: InternalTask[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.assistants', 'assistants')
      .leftJoinAndSelect('task.kanban', 'kanban')
      .leftJoinAndSelect('task.column', 'column')
      .leftJoinAndSelect('task.comments', 'comments')
      .leftJoinAndSelect('task.attachments', 'attachments')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.checklist', 'checklist')
      .leftJoinAndSelect('task.checklistItems', 'checklistItems')
      .leftJoinAndSelect(
        'checklistItems.checklistItem',
        'checklistItemDetails',
      );

    // Não listar templates por padrão
    queryBuilder.andWhere('task.isTemplate = :isTemplate', { isTemplate: false });

    // Aplicar filtros de permissão baseados no usuário
    await this.applyPermissionFilters(queryBuilder, currentUser);

    // Aplicar filtros opcionais
    if (filters?.search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters?.customerId) {
      queryBuilder.andWhere('customer.id = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters?.departmentId) {
      queryBuilder.andWhere('department.id = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    if (filters?.responsibleId) {
      queryBuilder.andWhere('responsible.id = :responsibleId', {
        responsibleId: filters.responsibleId,
      });
    }

    if (filters?.kanbanId) {
      queryBuilder.andWhere('kanban.id = :kanbanId', {
        kanbanId: filters.kanbanId,
      });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Ordenar por data de criação (mais recentes primeiro)
    queryBuilder.orderBy('task.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findMyTasks(
    currentUser: User,
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      priority?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{
    data: InternalTask[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.assistants', 'assistants')
      .leftJoinAndSelect('task.kanban', 'kanban')
      .leftJoinAndSelect('task.column', 'column')
      .where('responsible.id = :userId OR assistants.id = :userId', {
        userId: currentUser.id,
      });

    // Aplicar filtros opcionais
    if (filters?.search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findDepartmentTasks(
    departmentId: string,
    currentUser: User,
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      priority?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{
    data: InternalTask[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verificar se o usuário tem permissão para ver tarefas do departamento
    await this.checkDepartmentPermission(currentUser, departmentId);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.responsible', 'responsible')
      .leftJoinAndSelect('task.assistants', 'assistants')
      .leftJoinAndSelect('task.kanban', 'kanban')
      .leftJoinAndSelect('task.column', 'column')
      .where('department.id = :departmentId', { departmentId });

    // Aplicar filtros opcionais
    if (filters?.search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findOne(id: string, currentUser: User): Promise<InternalTask> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'department',
        'responsible',
        'assistants',
        'kanban',
        'column',
        'checklist',
        'checklistItems',
        'checklistItems.checklistItem',
        'checklistItems.completedBy',
        'comments',
        'comments.user',
        'attachments',
        'attachments.uploadedBy',
        'createdBy',
      ],
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // Verificar permissão para visualizar a tarefa
    await this.checkTaskPermission(currentUser, task);

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    currentUser: User,
  ): Promise<InternalTask> {
    const task = await this.findOne(id, currentUser);

    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    const {
      customerId,
      departmentId,
      responsibleId,
      coResponsibleId,
      assistantIds,
      columnId,
      checklistId,
      serviceId,
      ...updateData
    } = updateTaskDto;

    // Variável para armazenar o checklist se fornecido
    let checklist: Checklist | null = null;

    // Buscar entidades relacionadas se fornecidas
    if (customerId) {
      const customer = await this.companyRepository.findOne({
        where: { id: customerId },
      });
      if (!customer) throw new NotFoundException('Cliente não encontrado');
      task.customer = customer;
    }

    if (departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: departmentId },
      });
      if (!department)
        throw new NotFoundException('Departamento não encontrado');
      task.department = department;
    }

    // Atualizar responsável (pode ser null para departamento)
    if (responsibleId !== undefined) {
      if (responsibleId) {
        const responsible = await this.userRepository.findOne({
          where: { id: responsibleId },
        });
        if (!responsible)
          throw new NotFoundException('Responsável não encontrado');
        task.responsible = responsible;
      } else {
        task.responsible = null;
      }
    }

    // Atualizar corresponsável
    if (coResponsibleId !== undefined) {
      if (coResponsibleId) {
        const coResponsible = await this.userRepository.findOne({
          where: { id: coResponsibleId },
        });
        if (!coResponsible)
          throw new NotFoundException('Corresponsável não encontrado');
        task.coResponsible = coResponsible;
      } else {
        task.coResponsible = null;
      }
    }

    if (assistantIds) {
      const assistants = await this.userRepository.find({
        where: { id: In(assistantIds) },
      });
      task.assistants = assistants;
    }

    if (columnId) {
      const column = await this.columnRepository.findOne({
        where: { id: columnId },
      });
      if (!column) throw new NotFoundException('Coluna não encontrada');
      task.column = column;
    }

    if (checklistId) {
      console.log('🔍 Debug - Editando tarefa com checklistId:', checklistId);

      checklist = await this.checklistRepository.findOne({
        where: { id: checklistId },
        relations: ['items'],
      });
      if (!checklist) {
        throw new NotFoundException('Checklist não encontrado');
      }

      console.log(
        '🔍 Debug - Checklist encontrado para edição:',
        checklist.id,
        'com',
        checklist.items?.length,
        'itens',
      );

      // Remover itens de checklist existentes
      if (task.checklistItems && task.checklistItems.length > 0) {
        console.log('🔍 Debug - Removendo itens de checklist existentes...');
        await this.taskChecklistItemRepository.remove(task.checklistItems);
        console.log('🔍 Debug - Itens de checklist removidos com sucesso');
      }

      // Associar novo checklist
      task.checklist = checklist;
    }

    // Atualizar serviço
    if (serviceId !== undefined) {
      if (serviceId) {
        const service = await this.serviceRepository.findOne({
          where: { id: serviceId },
        });
        if (!service)
          throw new NotFoundException('Serviço não encontrado');
        task.service = service;
      } else {
        task.service = null;
      }
    }

    Object.assign(task, updateData);

    // Recalcular próxima data de recorrência se recorrência foi alterada
    if (task.isRecurrent && task.recurrenceType) {
      const baseDate = task.nextRecurrenceDate || task.dueDate || task.startDate || new Date();
      task.nextRecurrenceDate = this.calculateNextRecurrenceDate(task, baseDate);
    } else if (task.isRecurrent === false) {
      // Se desativou recorrência, limpar campos
      task.nextRecurrenceDate = null;
      task.lastRecurrenceDate = null;
    }

    // Salvar a tarefa atualizada primeiro
    const updatedTask = await this.taskRepository.save(task);

    // Criar notificações se a tarefa foi reatribuída
    if (responsibleId || coResponsibleId || assistantIds) {
      await this.createTaskNotifications(updatedTask);
    }

    // Criar itens de checklist APÓS salvar a tarefa (se checklist foi fornecido)
    if (checklistId && checklist) {
      console.log(
        '🔍 Debug - Criando itens de checklist para tarefa editada...',
      );

      // Verificar se ainda não existem itens (dupla verificação de segurança)
      const existingItems = await this.taskChecklistItemRepository.find({
        where: { task: { id: updatedTask.id } },
      });

      if (existingItems.length > 0) {
        console.log(
          `⚠️ Ainda existem ${existingItems.length} itens de checklist. Pulando criação.`,
        );
      } else if (checklist.items) {
        const taskChecklistItems = checklist.items.map((item) => {
          return this.taskChecklistItemRepository.create({
            task: updatedTask, // Usar a tarefa já salva
            checklistItem: item,
            isCompleted: false,
          });
        });

        console.log(
          '🔍 Debug - Salvando itens de checklist para tarefa editada...',
        );
        await this.taskChecklistItemRepository.save(taskChecklistItems);
        console.log(
          '🔍 Debug - Itens de checklist salvos com sucesso para tarefa editada',
        );
      }
    }

    return updatedTask;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const task = await this.findOne(id, currentUser);

    // Verificar permissão para excluir a tarefa
    await this.checkTaskDeletePermission(currentUser, task);

    // 🔧 CORREÇÃO: Resolver problema de integridade referencial
    // Deletar relacionamentos em ordem correta antes de deletar a tarefa

    try {
      // 1. Deletar anexos primeiro (mais crítico - FK constraint)
      if (task.attachments && task.attachments.length > 0) {
        console.log(
          `🗑️ Deletando ${task.attachments.length} anexos da tarefa ${id}`,
        );
        await this.attachmentRepository.remove(task.attachments);
      }

      // 2. Deletar comentários
      if (task.comments && task.comments.length > 0) {
        console.log(
          `🗑️ Deletando ${task.comments.length} comentários da tarefa ${id}`,
        );
        await this.commentRepository.remove(task.comments);
      }

      // 3. Remover assistentes (relacionamento many-to-many)
      if (task.assistants && task.assistants.length > 0) {
        console.log(
          `🗑️ Removendo ${task.assistants.length} assistentes da tarefa ${id}`,
        );
        task.assistants = [];
        await this.taskRepository.save(task);
      }

      // 4. Agora deletar a tarefa principal
      console.log(`🗑️ Deletando tarefa ${id}`);
      await this.taskRepository.remove(task);

      console.log(`✅ Tarefa ${id} deletada com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao deletar tarefa ${id}:`, error);
      throw new BadRequestException(
        `Erro ao deletar tarefa: ${error.message}. Verifique se não há dependências bloqueando a exclusão.`,
      );
    }
  }

  async moveTask(
    id: string,
    columnId: string,
    order: number,
    currentUser: User,
  ): Promise<InternalTask> {
    const task = await this.findOne(id, currentUser);
    await this.checkTaskEditPermission(currentUser, task);

    const column = await this.columnRepository.findOne({
      where: { id: columnId },
    });
    if (!column) {
      throw new NotFoundException('Coluna não encontrada');
    }

    task.column = column;
    task.order = order;

    return this.taskRepository.save(task);
  }

  // ============================== KANBANS ==============================

  async createKanban(
    createKanbanDto: CreateKanbanDto,
    currentUser: User,
  ): Promise<TaskKanban> {
    const { departmentId, ...kanbanData } = createKanbanDto;

    // Verificar se o usuário tem permissão para criar kanbans no departamento
    await this.checkDepartmentPermission(currentUser, departmentId);

    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });
    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    const kanban = this.kanbanRepository.create({
      ...kanbanData,
      department,
    });

    return this.kanbanRepository.save(kanban);
  }

  async findAllKanbans(currentUser: User): Promise<TaskKanban[]> {
    // Abordagem mais simples: buscar kanbans e colunas separadamente
    const kanbans = await this.kanbanRepository.find({
      relations: ['department'],
    });

    // Para cada kanban, buscar suas colunas
    console.log(currentUser);
    const kanbansWithColumns = await Promise.all(
      kanbans.map(async (kanban) => {
        const columns = await this.columnRepository.find({
          where: { kanban: { id: kanban.id } },
          order: { order: 'ASC' },
        });

        return {
          ...kanban,
          columns,
        };
      }),
    );

    console.log('🔍 findAllKanbans - Resultado:', kanbansWithColumns);

    return kanbansWithColumns;
  }

  async findKanbanById(id: string, currentUser: User): Promise<TaskKanban> {
    const kanban = await this.kanbanRepository.findOne({
      where: { id },
      relations: ['department', 'columns', 'tasks'],
    });

    if (!kanban) {
      throw new NotFoundException('Kanban não encontrado');
    }

    // Verificar permissão
    await this.checkDepartmentPermission(currentUser, kanban.department.id);

    return kanban;
  }

  // ============================== COLUNAS ==============================

  async createColumn(
    createColumnDto: CreateColumnDto,
    currentUser: User,
  ): Promise<TaskColumn> {
    const { kanbanId, ...columnData } = createColumnDto;

    const kanban = await this.kanbanRepository.findOne({
      where: { id: kanbanId },
      relations: ['department'],
    });

    if (!kanban) {
      throw new NotFoundException('Kanban não encontrado');
    }

    // Verificar permissão
    await this.checkDepartmentPermission(currentUser, kanban.department.id);

    // Obter a maior ordem das colunas do kanban
    const maxOrder = await this.columnRepository
      .createQueryBuilder('column')
      .leftJoin('column.kanban', 'kanban')
      .where('kanban.id = :kanbanId', { kanbanId })
      .select('MAX(column.order)', 'maxOrder')
      .getRawOne();

    const order = (maxOrder?.maxOrder || 0) + 1;

    const column = this.columnRepository.create({
      ...columnData,
      kanban,
      order,
    });

    return this.columnRepository.save(column);
  }

  async findAllColumns(currentUser: User): Promise<TaskColumn[]> {
    // Buscar todas as colunas dos kanbans que o usuário tem acesso
    const columns = await this.columnRepository
      .createQueryBuilder('column')
      .leftJoinAndSelect('column.kanban', 'kanban')
      .leftJoinAndSelect('kanban.department', 'department')
      .leftJoinAndSelect('department.company', 'company')
      .where('company.id = :companyId', {
        companyId: currentUser.selectedCompany.id,
      })
      .orderBy('column.order', 'ASC')
      .getMany();

    return columns;
  }

  async findColumnById(id: string, currentUser: User): Promise<TaskColumn> {
    const column = await this.columnRepository.findOne({
      where: { id },
      relations: ['kanban', 'kanban.department', 'kanban.department.company'],
    });

    if (!column) {
      throw new NotFoundException('Coluna não encontrada');
    }

    // Verificar permissão
    await this.checkDepartmentPermission(
      currentUser,
      column.kanban.department.id,
    );

    return column;
  }

  async updateColumn(
    id: string,
    updateColumnDto: UpdateColumnDto,
    currentUser: User,
  ): Promise<TaskColumn> {
    const column = await this.findColumnById(id, currentUser);

    // Atualizar apenas os campos fornecidos
    if (updateColumnDto.name !== undefined) {
      column.name = updateColumnDto.name;
    }
    if (updateColumnDto.order !== undefined) {
      column.order = updateColumnDto.order;
    }

    return this.columnRepository.save(column);
  }

  async deleteColumn(id: string, currentUser: User): Promise<void> {
    const column = await this.findColumnById(id, currentUser);

    // Verificar se há tarefas na coluna
    const taskCount = await this.taskRepository.count({
      where: { column: { id } },
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir a coluna "${column.name}" pois ela contém ${taskCount} tarefa(s). Mova as tarefas para outra coluna antes de excluir.`,
      );
    }

    await this.columnRepository.remove(column);
  }

  // ============================== COMENTÁRIOS ==============================

  async addComment(
    taskId: string,
    content: string,
    currentUser: User,
  ): Promise<TaskComment> {
    const task = await this.findOne(taskId, currentUser);

    const comment = this.commentRepository.create({
      content,
      task,
      user: currentUser,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Criar notificações para os usuários envolvidos
    await this.createCommentNotifications(task, savedComment);

    return savedComment;
  }

  async getComments(taskId: string, currentUser: User): Promise<TaskComment[]> {
    // Verificar se a tarefa existe
    await this.findOne(taskId, currentUser);

    return this.commentRepository.find({
      where: { task: { id: taskId } },
      relations: ['user'],
      order: { createdAt: 'ASC' }, // Comentários mais antigos primeiro
    });
  }

  async updateComment(
    commentId: string,
    content: string,
    currentUser: User,
  ): Promise<TaskComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['task', 'user'],
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verificar se o usuário é o autor do comentário
    if (comment.user.id !== currentUser.id) {
      throw new ForbiddenException(
        'Você só pode editar seus próprios comentários',
      );
    }

    // Verificar se a tarefa ainda existe
    await this.findOne(comment.task.id, currentUser);

    comment.content = content;
    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: string, currentUser: User): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['task', 'user'],
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verificar se o usuário é o autor do comentário ou responsável pela tarefa
    const task = await this.findOne(comment.task.id, currentUser);
    const isAuthor = comment.user.id === currentUser.id;
    const isResponsible = task.responsible.id === currentUser.id;

    if (!isAuthor && !isResponsible) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este comentário',
      );
    }

    await this.commentRepository.softDelete(commentId);
  }

  // ============================== PERMISSÕES ==============================

  private async checkDepartmentPermission(
    currentUser: User,
    departmentId: string,
  ): Promise<void> {
    console.log('🔒 Verificando permissão de departamento:', departmentId);
    console.log('🔒 Usuário atual:', currentUser.id);

    // ✅ IMPLEMENTAÇÃO REAL: Verificar permissões de departamento

    // 1. Verificar se o usuário é administrador
    const isAdmin = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    if (isAdmin) {
      console.log('🔒 Usuário é administrador - permissão concedida');
      return;
    }

    // 2. Verificar se o usuário tem acesso ao departamento
    const userDepartments =
      currentUser.userRoles?.flatMap(
        (userRole) =>
          userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
      ) || [];

    if (userDepartments.includes(departmentId)) {
      console.log(
        '🔒 Usuário tem acesso ao departamento - permissão concedida',
      );
      return;
    }

    // 3. Se não atender a nenhuma condição, negar acesso
    console.log('🔒 Usuário não tem permissão para acessar este departamento');
    throw new ForbiddenException(
      'Você não tem permissão para acessar este departamento. Entre em contato com o administrador para solicitar acesso.',
    );
  }

  private async checkTaskEditPermission(
    currentUser: User,
    task: InternalTask,
  ): Promise<void> {
    console.log('🔒 Verificação de permissão de edição de tarefa:', task.id);
    console.log('🔒 Usuário atual:', currentUser.id);

    // ✅ IMPLEMENTAÇÃO REAL: Verificar permissões de edição

    // 1. Verificar se o usuário é administrador
    const isAdmin = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    if (isAdmin) {
      console.log('🔒 Usuário é administrador - permissão concedida');
      return;
    }

    // 2. Verificar se é o criador da tarefa
    if (task.createdBy?.id === currentUser.id) {
      console.log('🔒 Usuário é o criador da tarefa - permissão concedida');
      return;
    }

    // 3. Verificar se é o responsável pela tarefa
    if (task.responsible?.id === currentUser.id) {
      console.log(
        '🔒 Usuário é o responsável pela tarefa - permissão concedida',
      );
      return;
    }

    // 4. Verificar se é assistente da tarefa
    const isAssistant = task.assistants?.some(
      (assistant) => assistant.id === currentUser.id,
    );

    if (isAssistant) {
      console.log('🔒 Usuário é assistente da tarefa - permissão concedida');
      return;
    }

    // 5. Verificar se é gestor do departamento da tarefa
    const userDepartments =
      currentUser.userRoles?.flatMap(
        (userRole) =>
          userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
      ) || [];

    if (userDepartments.includes(task.department?.id)) {
      // Verificar se tem regra de gestão
      const hasManagementRule = currentUser.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) => roleRule.rule?.rule === 'department-manager',
        ),
      );

      if (hasManagementRule) {
        console.log(
          '🔒 Usuário é gestor do departamento - permissão concedida',
        );
        return;
      }
    }

    // 6. Se não atender a nenhuma condição, negar acesso
    console.log('🔒 Usuário não tem permissão para editar esta tarefa');
    throw new ForbiddenException(
      'Você não tem permissão para editar esta tarefa. Apenas criadores, responsáveis, assistentes, gestores de departamento ou administradores podem editar tarefas.',
    );
  }

  private async checkTaskDeletePermission(
    currentUser: User,
    task: InternalTask,
  ): Promise<void> {
    console.log('🔒 Verificação de permissão de exclusão de tarefa:', task.id);
    console.log('🔒 Usuário atual:', currentUser.id);

    // ✅ IMPLEMENTAÇÃO REAL: Verificar permissões de exclusão

    // 1. Verificar se o usuário é administrador
    const isAdmin = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    if (isAdmin) {
      console.log('🔒 Usuário é administrador - permissão concedida');
      return;
    }

    // 2. Verificar se é o criador da tarefa
    if (task.createdBy?.id === currentUser.id) {
      console.log('🔒 Usuário é o criador da tarefa - permissão concedida');
      return;
    }

    // 3. Verificar se é o responsável pela tarefa
    if (task.responsible?.id === currentUser.id) {
      console.log(
        '🔒 Usuário é o responsável pela tarefa - permissão concedida',
      );
      return;
    }

    // 4. Verificar se é gestor do departamento da tarefa
    const userDepartments =
      currentUser.userRoles?.flatMap(
        (userRole) =>
          userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
      ) || [];

    if (userDepartments.includes(task.department?.id)) {
      // Verificar se tem regra de gestão
      const hasManagementRule = currentUser.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) => roleRule.rule?.rule === 'department-manager',
        ),
      );

      if (hasManagementRule) {
        console.log(
          '🔒 Usuário é gestor do departamento - permissão concedida',
        );
        return;
      }
    }

    // 5. Se não atender a nenhuma condição, negar acesso
    console.log('🔒 Usuário não tem permissão para excluir esta tarefa');
    throw new ForbiddenException(
      'Você não tem permissão para excluir esta tarefa. Apenas criadores, responsáveis, gestores de departamento ou administradores podem excluir tarefas.',
    );
  }

  private async applyPermissionFilters(
    queryBuilder: any,
    currentUser: User,
  ): Promise<void> {
    // Verificar se o usuário é administrador
    const isAdmin = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    // Se for administrador, pode ver todas as tarefas
    if (isAdmin) {
      return;
    }

    // Obter departamentos do usuário
    const userDepartments =
      currentUser.userRoles?.flatMap(
        (userRole) =>
          userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
      ) || [];

    // Aplicar filtros de visibilidade:
    // 1. Tarefas criadas pelo usuário (se o campo existir)
    // 2. Tarefas onde o usuário é responsável
    // 3. Tarefas do departamento do usuário
    queryBuilder.andWhere(
      '(task.createdBy.id = :userId OR task.responsible.id = :userId OR task.department.id IN (:...userDepartments))',
      {
        userId: currentUser.id,
        userDepartments:
          userDepartments.length > 0 ? userDepartments : ['no-access'],
      },
    );
  }

  private async applyKanbanPermissionFilters(
    queryBuilder: any,
    currentUser: User,
  ): Promise<void> {
    console.log(
      '🔒 Aplicando filtros de permissão de kanban para usuário:',
      currentUser,
    );
    console.log('🔒 Usuário atual:', currentUser);
    return;
  }

  // ============================== VERIFICAÇÃO DE PERMISSÕES ==============================

  private async checkTaskPermission(
    currentUser: User,
    task: InternalTask,
  ): Promise<void> {
    // Verificar se o usuário é administrador
    const isAdmin = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    // Se for administrador, pode ver todas as tarefas
    if (isAdmin) {
      return;
    }

    // Verificar se é o criador da tarefa (se o campo existir)
    if (task.createdBy?.id === currentUser.id) {
      return;
    }

    // Verificar se é o responsável pela tarefa
    if (task.responsible?.id === currentUser.id) {
      return;
    }

    // Verificar se é membro do departamento da tarefa
    const userDepartments =
      currentUser.userRoles?.flatMap(
        (userRole) =>
          userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
      ) || [];

    if (userDepartments.includes(task.department?.id)) {
      return;
    }

    // Se não atender a nenhuma condição, negar acesso
    throw new ForbiddenException('Sem permissão para visualizar esta tarefa');
  }

  // ============================== CHECKLIST ==============================

  async removeChecklistFromTask(
    taskId: string,
    currentUser: User,
  ): Promise<InternalTask> {
    console.log('🗑️ Removendo checklist da tarefa:', taskId);

    // Buscar a tarefa com todas as relações necessárias
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        'customer',
        'department',
        'responsible',
        'assistants',
        'kanban',
        'column',
        'checklist',
        'checklistItems',
        'checklistItems.checklistItem',
        'checklistItems.completedBy',
        'comments',
        'comments.user',
        'attachments',
        'attachments.uploadedBy',
        'createdBy',
      ],
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // Verificar permissão para visualizar a tarefa
    await this.checkTaskPermission(currentUser, task);

    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    if (!task.checklist) {
      throw new BadRequestException(
        'Esta tarefa não possui checklist associado',
      );
    }

    try {
      // 1. Remover itens de checklist da tarefa
      if (task.checklistItems && task.checklistItems.length > 0) {
        console.log(
          `🗑️ Removendo ${task.checklistItems.length} itens de checklist da tarefa ${taskId}`,
        );
        await this.taskChecklistItemRepository.remove(task.checklistItems);
      }

      // 2. Remover associação do checklist com a tarefa
      task.checklist = null;
      task.checklistItems = [];

      // 3. Salvar a tarefa atualizada
      const updatedTask = await this.taskRepository.save(task);
      console.log(`✅ Checklist removido da tarefa ${taskId} com sucesso`);

      return updatedTask;
    } catch (error) {
      console.error(`❌ Erro ao remover checklist da tarefa ${taskId}:`, error);
      throw new BadRequestException(
        `Erro ao remover checklist da tarefa: ${error.message}`,
      );
    }
  }

  // ============================== ANEXOS ==============================

  async uploadAttachment(
    taskId: string,
    file: Express.Multer.File,
    currentUser: User,
  ): Promise<TaskAttachment> {
    console.log('📎 Upload de anexo iniciado para tarefa:', taskId);
    console.log('📎 Arquivo recebido:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer ? 'Buffer presente' : 'Buffer ausente',
    });

    // Verificar se a tarefa existe
    const task = await this.findOne(taskId, currentUser);
    console.log('📎 Tarefa encontrada:', task.id);

    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    console.log('📎 Iniciando upload para storage...');
    // Upload do arquivo para o storage
    const fileUrl = await this.storageService.uploadFile(
      file,
      'internal-tasks',
    );
    console.log('📎 Arquivo enviado para storage, URL:', fileUrl);

    // Criar registro do anexo no banco
    const attachment = this.attachmentRepository.create({
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: fileUrl,
      task,
      uploadedBy: currentUser,
    });

    console.log('📎 Salvando anexo no banco...');
    const savedAttachment = await this.attachmentRepository.save(attachment);
    console.log('📎 Anexo salvo com sucesso:', savedAttachment.id);
    console.log('📎 URL salva no banco:', savedAttachment.url);

    return savedAttachment;
  }

  async getAttachments(
    taskId: string,
    currentUser: User,
  ): Promise<TaskAttachment[]> {
    // Verificar se a tarefa existe
    await this.findOne(taskId, currentUser);

    return this.attachmentRepository.find({
      where: { task: { id: taskId } },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async downloadAttachment(
    attachmentId: string,
    currentUser: User,
  ): Promise<{ file: Buffer; filename: string; mimeType: string }> {
    console.log('📎 DownloadAttachment iniciado para anexo:', attachmentId);
    console.log('📎 Usuário atual:', currentUser.id);

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['task'],
    });

    if (!attachment) {
      console.log('📎 Anexo não encontrado no banco');
      throw new NotFoundException('Anexo não encontrado');
    }

    console.log('📎 Anexo encontrado:', {
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      url: attachment.url,
      taskId: attachment.task?.id,
    });

    // Verificar permissão para visualizar a tarefa
    console.log('📎 Verificando permissões...');
    await this.checkTaskPermission(currentUser, attachment.task);
    console.log('📎 Permissões verificadas com sucesso');

    // Buscar o arquivo do storage
    console.log('📎 Iniciando download do storage, URL:', attachment.url);
    const fileBuffer = await this.storageService.downloadFile(attachment.url);
    console.log('📎 Download concluído, tamanho do buffer:', fileBuffer.length);

    return {
      file: fileBuffer,
      filename: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  }

  // ✅ NOVA FUNCIONALIDADE: Excluir anexo de tarefa
  async deleteAttachment(
    attachmentId: string,
    currentUser: User,
  ): Promise<void> {
    console.log('🗑️ DeleteAttachment iniciado para anexo:', attachmentId);
    console.log('🗑️ Usuário atual:', currentUser.id);

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['task'],
    });

    if (!attachment) {
      console.log('🗑️ Anexo não encontrado no banco');
      throw new NotFoundException('Anexo não encontrado');
    }

    console.log('🗑️ Anexo encontrado:', {
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      url: attachment.url,
      taskId: attachment.task?.id,
    });

    // Verificar permissão para editar a tarefa (quem pode editar pode excluir anexos)
    console.log('🗑️ Verificando permissões...');
    await this.checkTaskEditPermission(currentUser, attachment.task);
    console.log('🗑️ Permissões verificadas com sucesso');

    try {
      // 1. Deletar arquivo do storage
      console.log('🗑️ Deletando arquivo do storage, URL:', attachment.url);

      // Extrair o identifier (filename) da URL para o storage service
      let identifier: string;

      // 🔧 CORREÇÃO: Tratar URLs incompletas (sem protocolo)
      let processedUrl = attachment.url;
      if (processedUrl.startsWith('localhost:')) {
        processedUrl = `http://${processedUrl}`;
        console.log('🔧 URL corrigida:', processedUrl);
      }

      // Extrair o identifier de diferentes formatos de URL
      if (processedUrl.includes('/uploads/')) {
        // Formato: http://localhost:24985/uploads/internal-tasks/arquivo.pdf
        const urlParts = processedUrl.split('/uploads/');
        if (urlParts.length === 2) {
          identifier = urlParts[1]; // internal-tasks/arquivo.pdf
        } else {
          identifier = attachment.filename; // Fallback para o filename
        }
      } else if (processedUrl.startsWith('/uploads/')) {
        // Formato: /uploads/internal-tasks/arquivo.pdf
        identifier = processedUrl.substring(9); // Remove '/uploads/'
      } else if (processedUrl.includes('uploads/')) {
        // Formato: uploads/internal-tasks/arquivo.pdf
        identifier = processedUrl;
      } else {
        // Fallback: usar o filename
        identifier = attachment.filename;
      }

      // Log para debug
      console.log('🔍 URL original:', attachment.url);
      console.log('🔍 URL processada:', processedUrl);
      console.log('🔍 Identifier extraído:', identifier);

      console.log('🗑️ Identifier extraído para exclusão:', identifier);
      await this.storageService.deleteFile(identifier);
      console.log('🗑️ Arquivo deletado do storage com sucesso');

      // 2. Deletar registro do banco
      console.log('🗑️ Deletando registro do anexo no banco...');
      await this.attachmentRepository.remove(attachment);
      console.log('🗑️ Anexo deletado do banco com sucesso');
    } catch (error) {
      console.error('❌ Erro ao deletar anexo:', error);
      throw new BadRequestException(
        `Erro ao deletar anexo: ${error.message}. Verifique se o arquivo ainda existe no storage.`,
      );
    }
  }

  // ============================== NOTIFICAÇÕES ==============================

  /**
   * Cria notificações para os usuários envolvidos em uma tarefa
   */
  private async createTaskNotifications(task: InternalTask): Promise<void> {
    try {
      // Buscar a tarefa com todas as relações necessárias
      const taskWithRelations = await this.taskRepository.findOne({
        where: { id: task.id },
        relations: ['responsible', 'coResponsible', 'assistants', 'department'],
      });

      if (!taskWithRelations) return;

      const users: User[] = [];

      // Se tem responsável, notificar
      if (taskWithRelations.responsible) {
        users.push(taskWithRelations.responsible);
      }

      // Se tem corresponsável, notificar
      if (taskWithRelations.coResponsible) {
        users.push(taskWithRelations.coResponsible);
      }

      // Se tem assistentes, notificar
      if (
        taskWithRelations.assistants &&
        taskWithRelations.assistants.length > 0
      ) {
        users.push(...taskWithRelations.assistants);
      }

      // Nota: Se não tem responsável específico, a tarefa fica visível para todo o departamento
      // mas não criamos notificações para todos para evitar spam

      // Criar notificações para cada usuário (evitando duplicados)
      const uniqueUsers = Array.from(new Set(users.map((u) => u.id)))
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean) as User[];

      for (const user of uniqueUsers) {
        // Verificar se já existe notificação
        const already = await this.notificationsService.exists({
          referenceType: 'internal_task',
          referenceId: taskWithRelations.id,
          userId: user.id,
        });

        if (already) continue;

        await this.notificationsService.create({
          type: NotificationType.INTERNAL_TASK,
          title: `Nova tarefa atribuída: ${taskWithRelations.title}`,
          message: `Você foi atribuído à tarefa "${taskWithRelations.title}"${
            taskWithRelations.dueDate
              ? ` com vencimento em ${new Date(
                  taskWithRelations.dueDate,
                ).toLocaleDateString('pt-BR')}`
              : ''
          }.`,
          referenceType: 'internal_task',
          referenceId: taskWithRelations.id,
          userId: user.id,
          scheduledAt: new Date(),
          status: NotificationStatus.PENDING,
        });
      }
    } catch (error) {
      console.error('Erro ao criar notificações da tarefa:', error);
      // Não lança erro para não impedir a criação da tarefa
    }
  }

  /**
   * Cria notificações quando um comentário é adicionado
   */
  private async createCommentNotifications(
    task: InternalTask,
    comment: TaskComment,
  ): Promise<void> {
    try {
      // Buscar a tarefa com todas as relações necessárias
      const taskWithRelations = await this.taskRepository.findOne({
        where: { id: task.id },
        relations: ['responsible', 'coResponsible', 'assistants', 'department'],
      });

      if (!taskWithRelations) return;

      const users: User[] = [];

      // Notificar responsável
      if (
        taskWithRelations.responsible &&
        taskWithRelations.responsible.id !== comment.user.id
      ) {
        users.push(taskWithRelations.responsible);
      }

      // Notificar corresponsável
      if (
        taskWithRelations.coResponsible &&
        taskWithRelations.coResponsible.id !== comment.user.id
      ) {
        users.push(taskWithRelations.coResponsible);
      }

      // Notificar assistentes
      if (taskWithRelations.assistants) {
        users.push(
          ...taskWithRelations.assistants.filter(
            (a) => a.id !== comment.user.id,
          ),
        );
      }

      // Nota: Se não tem responsável específico, a tarefa fica visível para todo o departamento
      // mas não criamos notificações para todos para evitar spam

      // Criar notificações para cada usuário (evitando duplicados)
      const uniqueUsers = Array.from(new Set(users.map((u) => u.id)))
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean) as User[];

      for (const user of uniqueUsers) {
        await this.notificationsService.create({
          type: NotificationType.INTERNAL_TASK,
          title: `Novo comentário: ${taskWithRelations.title}`,
          message: `${comment.user.name} comentou na tarefa "${
            taskWithRelations.title
          }": ${
            comment.content.length > 100
              ? comment.content.substring(0, 100) + '...'
              : comment.content
          }`,
          referenceType: 'internal_task',
          referenceId: taskWithRelations.id,
          userId: user.id,
          scheduledAt: new Date(),
          status: NotificationStatus.PENDING,
        });
      }
    } catch (error) {
      console.error('Erro ao criar notificações de comentário:', error);
      // Não lança erro para não impedir a criação do comentário
    }
  }

  // ============================== CRONÔMETRO DE TEMPO ==============================

  /**
   * Inicia o cronômetro para uma tarefa
   */
  async startTimer(
    taskId: string,
    currentUser: User,
    startTimeDto?: StartTimeDto,
  ): Promise<TaskTimeEntryDto> {
    const task = await this.findOne(taskId, currentUser);
    
    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    // Verificar se já existe um cronômetro ativo ou pausado para este usuário nesta tarefa
    // Buscar TODOS os cronômetros sem endTime (ativos ou pausados)
    const existingEntry = await this.timeEntryRepository.findOne({
      where: {
        task: { id: taskId },
        user: { id: currentUser.id },
        endTime: null, // null significa que está ativo ou pausado
      },
      relations: ['user', 'task'],
    });

    if (existingEntry) {
      console.log('🔍 StartTimer - Cronômetro existente encontrado:', {
        id: existingEntry.id,
        isPaused: existingEntry.isPaused,
        isPausedType: typeof existingEntry.isPaused,
        duration: existingEntry.duration,
        startTime: existingEntry.startTime,
      });

      // Verificar se o cronômetro está realmente ativo ou apenas parece estar
      const isPausedValue = existingEntry.isPaused;
      const isFieldExists = isPausedValue !== null && isPausedValue !== undefined;
      
      // Detectar se o cronômetro está realmente ativo ou pode ser retomado
      // Um cronômetro está realmente ativo APENAS se:
      // 1. isPaused é explicitamente false E
      // 2. startTime é MUITO recente (menos de 10 segundos) E duration é zero OU
      // 3. isPaused é false E não há duration acumulada
      const now = new Date();
      const timeSinceStart = Math.floor(
        (now.getTime() - existingEntry.startTime.getTime()) / 1000,
      );
      const isStartTimeVeryRecent = timeSinceStart < 10; // Menos de 10 segundos
      const hasDuration = (existingEntry.duration || 0) > 0;
      
      // Se tem duration acumulada, significa que já foi pausado antes
      // Mesmo que startTime seja recente, se tem duration > 0, permite retomar
      // (isto cobre casos onde o pauseTimer não atualizou isPaused corretamente)
      const canResumeBecauseHasDuration = hasDuration;
      
      // Detecta cronômetros fantasma (startTime antiga com duration)
      const isGhostPaused = 
        isPausedValue === false && 
        hasDuration && 
        timeSinceStart > 120; // Mais de 2 minutos
      
      // Cronômetro está realmente ativo se:
      // - isPaused é false E
      // - (startTime muito recente E sem duration) OU (sem duration e startTime recente)
      const isReallyActive = 
        isPausedValue === false && 
        ((isStartTimeVeryRecent && !hasDuration) || (!hasDuration && timeSinceStart < 300));
      
      console.log('🔍 Análise do cronômetro:', {
        isPaused: isPausedValue,
        duration: existingEntry.duration,
        timeSinceStart,
        isStartTimeVeryRecent,
        hasDuration,
        canResumeBecauseHasDuration,
        isGhostPaused,
        isReallyActive,
      });
      
      // Retomar se:
      // 1. Campo não existe (antigo)
      // 2. isPaused é explicitamente true
      // 3. É um "cronômetro fantasma" (isPaused=false mas parece pausado)
      // 4. Tem duration acumulada (independente de startTime - permite retomar sempre)
      const shouldResume = 
        !isFieldExists || 
        isPausedValue === true || 
        isGhostPaused ||
        canResumeBecauseHasDuration;
      
      if (shouldResume) {
        console.log('✅ Retomando cronômetro');
        
        // Acumular o tempo desde o último startTime
        // IMPORTANTE: Se isPaused = true, o tempo JÁ FOI acumulado no pauseTimer, então NÃO acumula novamente
        // Só acumula se:
        // 1. É um cronômetro fantasma (startTime muito antiga) OU
        // 2. O campo isPaused não existia (registro antigo) OU
        // 3. É um caso de estado inconsistente (tem duration mas isPaused=false e startTime não muito recente)
        // NÃO acumula se isPaused = true (já foi acumulado no pauseTimer)
        const wasCorrectlyPaused = isPausedValue === true;
        const shouldAccumulateTime = 
          !wasCorrectlyPaused && // Não acumula se foi pausado corretamente
          (isGhostPaused || !isFieldExists || (hasDuration && !isStartTimeVeryRecent));
        
        if (shouldAccumulateTime) {
          const elapsedTime = Math.floor(
            (now.getTime() - existingEntry.startTime.getTime()) / 1000,
          );
          // Acumular apenas se for positivo e não for muito grande (evitar valores absurdos)
          // Mas só se o tempo decorrido for menor que 5 minutos (evitar acumular tempo de dias atrás)
          if (elapsedTime > 0 && elapsedTime < 300) { // Menos de 5 minutos
            const oldDuration = existingEntry.duration || 0;
            existingEntry.duration = oldDuration + elapsedTime;
            console.log(`📊 Tempo acumulado: ${elapsedTime}s (de ${oldDuration}s para ${existingEntry.duration}s)`);
          } else if (elapsedTime >= 300) {
            // Se passou muito tempo, não acumula (provavelmente foi esquecido aberto)
            console.log(`⚠️ Tempo decorrido muito grande (${elapsedTime}s), não acumulando`);
          }
        } else if (wasCorrectlyPaused) {
          console.log('✅ Cronômetro foi pausado corretamente, tempo já está acumulado. Apenas retomando...');
        }
        
        existingEntry.isPaused = false;
        existingEntry.endTime = null; // Garantir que endTime está null (não finalizado)
        existingEntry.startTime = new Date(); // Novo startTime para continuar contando

        if (startTimeDto?.notes) {
          existingEntry.notes = startTimeDto.notes;
        }

        console.log('🔄 Salvando cronômetro retomado:', {
          id: existingEntry.id,
          isPaused: existingEntry.isPaused,
          endTime: existingEntry.endTime,
          startTime: existingEntry.startTime,
          duration: existingEntry.duration,
        });

        const resumedEntry = await this.timeEntryRepository.save(existingEntry);
        console.log('✅ Cronômetro retomado:', {
          id: resumedEntry.id,
          isPaused: resumedEntry.isPaused,
          duration: resumedEntry.duration,
        });
        return this.formatTimeEntry(resumedEntry);
      } else {
        // Se existe um cronômetro realmente ativo (não pausado), dar erro
        console.log('⚠️ Cronômetro já está ativo, não pode iniciar outro');
        throw new BadRequestException(
          'Já existe um cronômetro ativo para esta tarefa. Pause o cronômetro atual antes de iniciar um novo.',
        );
      }
    }

    // Criar nova entrada de tempo apenas se não existir nenhuma
    const timeEntry = this.timeEntryRepository.create({
      task,
      user: currentUser,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      isPaused: false,
      notes: startTimeDto?.notes,
    });

    const savedEntry = await this.timeEntryRepository.save(timeEntry);

    // Recarregar com relações para garantir que task está disponível
    const entryWithRelations = await this.timeEntryRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['user', 'task'],
    });

    return this.formatTimeEntry(entryWithRelations!);
  }

  /**
   * Para/finaliza o cronômetro ativo
   */
  async stopTimer(
    taskId: string,
    currentUser: User,
    stopTimeDto?: StopTimeDto,
  ): Promise<TaskTimeEntryDto> {
    const task = await this.findOne(taskId, currentUser);
    
    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    // Buscar entrada ativa (não pausada)
    const activeEntry = await this.timeEntryRepository.findOne({
      where: {
        task: { id: taskId },
        user: { id: currentUser.id },
        endTime: null,
        isPaused: false,
      },
      relations: ['user', 'task'],
    });

    if (!activeEntry) {
      throw new NotFoundException('Não há cronômetro ativo para esta tarefa.');
    }

    // Calcular duração total (incluindo tempo já acumulado)
    const endTime = new Date();
    const currentDuration = Math.floor(
      (endTime.getTime() - activeEntry.startTime.getTime()) / 1000,
    );
    const totalDuration = activeEntry.duration + currentDuration;

    activeEntry.endTime = endTime;
    activeEntry.duration = totalDuration;
    activeEntry.isPaused = false; // Garantir que não está pausado
    
    if (stopTimeDto?.notes) {
      activeEntry.notes = stopTimeDto.notes;
    }

    const savedEntry = await this.timeEntryRepository.save(activeEntry);

    return this.formatTimeEntry(savedEntry);
  }

  /**
   * Pausa o cronômetro ativo (sem finalizar)
   */
  async pauseTimer(
    taskId: string,
    currentUser: User,
    pauseTimeDto?: PauseTimeDto,
  ): Promise<TaskTimeEntryDto> {
    const task = await this.findOne(taskId, currentUser);
    
    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    // Buscar entrada ativa (sem endTime e não pausada)
    // Usar query mais flexível para lidar com campo isPaused que pode não existir ainda
    const activeEntry = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .where('entry.task = :taskId', { taskId })
      .andWhere('entry.user = :userId', { userId: currentUser.id })
      .andWhere('entry.endTime IS NULL')
      .andWhere('(entry.isPaused = :isPaused OR entry.isPaused IS NULL)', {
        isPaused: false,
      })
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoinAndSelect('entry.task', 'task')
      .getOne();

    if (!activeEntry) {
      throw new NotFoundException('Não há cronômetro ativo para esta tarefa.');
    }

    // Calcular duração atual e acumular
    const pauseTime = new Date();
    const currentDuration = Math.floor(
      (pauseTime.getTime() - activeEntry.startTime.getTime()) / 1000,
    );
    const totalDuration = activeEntry.duration + currentDuration;

    console.log('⏸️ Pausando cronômetro:', {
      id: activeEntry.id,
      durationAntes: activeEntry.duration,
      durationNovo: totalDuration,
      isPausedAntes: activeEntry.isPaused,
    });

    // Atualizar entrada com tempo acumulado e marcar como pausada
    activeEntry.duration = totalDuration;
    activeEntry.isPaused = true; // Forçar boolean true
    activeEntry.endTime = null; // Garantir que endTime está null (não finalizado ao pausar)
    activeEntry.startTime = pauseTime; // Atualizar startTime para quando retomar
    
    if (pauseTimeDto?.notes) {
      activeEntry.notes = pauseTimeDto.notes;
    }

    console.log('🔄 PauseTimer - Salvando cronômetro:', {
      id: activeEntry.id,
      isPaused: activeEntry.isPaused,
      endTime: activeEntry.endTime,
      startTime: activeEntry.startTime,
      duration: activeEntry.duration,
    });

    const savedEntry = await this.timeEntryRepository.save(activeEntry);
    console.log('✅ Cronômetro pausado:', {
      id: savedEntry.id,
      isPaused: savedEntry.isPaused,
      duration: savedEntry.duration,
    });

    return this.formatTimeEntry(savedEntry);
  }

  /**
   * Retoma o cronômetro pausado
   */
  async resumeTimer(
    taskId: string,
    currentUser: User,
    resumeTimeDto?: ResumeTimeDto,
  ): Promise<TaskTimeEntryDto> {
    const task = await this.findOne(taskId, currentUser);
    
    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    // Buscar entrada pausada
    const pausedEntry = await this.timeEntryRepository.findOne({
      where: {
        task: { id: taskId },
        user: { id: currentUser.id },
        endTime: null,
        isPaused: true,
      },
      relations: ['user', 'task'],
    });

    if (!pausedEntry) {
      throw new NotFoundException(
        'Não há cronômetro pausado para esta tarefa.',
      );
    }

    // Retomar cronômetro
    pausedEntry.isPaused = false;
    pausedEntry.endTime = null; // Garantir que endTime está null (não finalizado)
    pausedEntry.startTime = new Date(); // Novo startTime para continuar contando
    
    if (resumeTimeDto?.notes) {
      pausedEntry.notes = resumeTimeDto.notes;
    }

    console.log('🔄 ResumeTimer - Salvando cronômetro:', {
      id: pausedEntry.id,
      isPaused: pausedEntry.isPaused,
      endTime: pausedEntry.endTime,
      startTime: pausedEntry.startTime,
      duration: pausedEntry.duration,
    });

    const savedEntry = await this.timeEntryRepository.save(pausedEntry);

    return this.formatTimeEntry(savedEntry);
  }

  /**
   * Obtém estatísticas de tempo de uma tarefa
   */
  async getTaskTimeStats(
    taskId: string,
    currentUser: User,
  ): Promise<TaskTimeStatsDto> {
    await this.findOne(taskId, currentUser);

    // Buscar todas as entradas de tempo da tarefa
    const entries = await this.timeEntryRepository.find({
      where: { task: { id: taskId } },
      relations: ['user', 'task'],
      order: { startTime: 'DESC' },
    });

    // Calcular tempo total
    let totalTime = 0;
    let activeEntry: TaskTimeEntryDto | null = null;
    const now = new Date().getTime();

    const formattedEntries = entries.map((entry) => {
      const formatted = this.formatTimeEntry(entry);
      
      // Se a entrada está ativa (sem endTime)
      if (!entry.endTime) {
        // Se for do usuário atual, marcar como ativa ou pausada
        if (entry.user.id === currentUser.id) {
          activeEntry = formatted;
        }
        
        // Calcular duração atual apenas para entradas não pausadas
        const isPaused = entry.isPaused ?? false;
        if (!isPaused) {
          // Calcular tempo decorrido desde o último startTime
          const startTime = new Date(entry.startTime).getTime();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          
          // Duração total = tempo acumulado (duration) + tempo decorrido desde o último startTime
          // O duration já contém todo o tempo acumulado de sessões anteriores
          formatted.duration = entry.duration + Math.max(0, elapsedSeconds);
        }
        // Se está pausado, usar apenas o duration acumulado (já está correto)
      }

      totalTime += formatted.duration;
      return formatted;
    });

    return {
      totalTime,
      activeEntry,
      entries: formattedEntries,
      isRunning: activeEntry !== null && !activeEntry.isPaused,
    };
  }

  /**
   * Obtém histórico de tempo de um usuário específico
   */
  async getUserTimeEntries(
    taskId: string,
    userId: string,
    currentUser: User,
  ): Promise<TaskTimeEntryDto[]> {
    await this.findOne(taskId, currentUser);

    const entries = await this.timeEntryRepository.find({
      where: {
        task: { id: taskId },
        user: { id: userId },
      },
      relations: ['user', 'task'],
      order: { startTime: 'DESC' },
    });

    return entries.map((entry) => this.formatTimeEntry(entry));
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
      const interval = task.recurrenceInterval || 1;
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + interval);
      
      if (task.scheduledDate) {
        const scheduled = new Date(task.scheduledDate);
        nextDate.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);
      }
      
      return nextDate;
    }

    // SEMANAL
    if (task.recurrenceType === InternalTaskRecurrenceType.WEEKLY) {
      const interval = task.recurrenceInterval || 1;
      const weekDays = task.recurrenceDaysOfWeek?.map(Number) || [];
      
      if (weekDays.length === 0) {
        const originalDate = task.dueDate || task.startDate || task.createdAt || now;
        const originalDay = new Date(originalDate).getDay();
        weekDays.push(originalDay);
      }

      for (let i = 0; i < 7 * interval; i++) {
        const candidate = new Date(now);
        candidate.setDate(now.getDate() + i);
        const candidateDay = candidate.getDay();

        if (weekDays.includes(candidateDay) && candidate > now) {
          if (task.scheduledDate) {
            const scheduled = new Date(task.scheduledDate);
            candidate.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);
          }
          return candidate;
        }
      }
    }

    // MENSAL
    if (task.recurrenceType === InternalTaskRecurrenceType.MONTHLY) {
      const dayOfMonth = task.recurrenceDayOfMonth;
      if (!dayOfMonth) return null;

      const interval = task.recurrenceInterval || 1;
      
      const currentMonth = new Date(now);
      currentMonth.setDate(dayOfMonth);
      currentMonth.setHours(now.getHours(), now.getMinutes(), 0, 0);
      
      if (currentMonth > now && dayOfMonth <= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) {
        if (task.scheduledDate) {
          const scheduled = new Date(task.scheduledDate);
          currentMonth.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);
        }
        return currentMonth;
      }

      const nextMonth = new Date(now.getFullYear(), now.getMonth() + interval, dayOfMonth);
      if (task.scheduledDate) {
        const scheduled = new Date(task.scheduledDate);
        nextMonth.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);
      }
      
      const lastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      if (dayOfMonth > lastDayOfMonth) {
        nextMonth.setDate(lastDayOfMonth);
      }
      
      return nextMonth;
    }

    // ANUAL
    if (task.recurrenceType === InternalTaskRecurrenceType.YEARLY) {
      const interval = task.recurrenceInterval || 1;
      const dayOfMonth = task.recurrenceDayOfMonth || new Date(now).getDate();
      
      const originalDate = task.dueDate || task.startDate || task.createdAt || now;
      const month = new Date(originalDate).getMonth();
      
      const currentYear = new Date(now.getFullYear(), month, dayOfMonth);
      currentYear.setHours(now.getHours(), now.getMinutes(), 0, 0);
      
      if (currentYear > now) {
        if (task.scheduledDate) {
          const scheduled = new Date(task.scheduledDate);
          currentYear.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);
        }
        return currentYear;
      }

      const nextYear = new Date(now.getFullYear() + interval, month, dayOfMonth);
      if (task.scheduledDate) {
        const scheduled = new Date(task.scheduledDate);
        nextYear.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0);
      }
      
      return nextYear;
    }

    return null;
  }

  private formatTimeEntry(entry: TaskTimeEntry): TaskTimeEntryDto {
    return {
      id: entry.id,
      taskId: entry.task.id,
      userId: entry.user.id,
      userName: entry.user.name,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      isPaused: entry.isPaused ?? false, // Tratar registros antigos
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
