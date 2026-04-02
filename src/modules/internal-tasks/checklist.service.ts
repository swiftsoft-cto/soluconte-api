import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Checklist, ChecklistType } from './entities/checklist.entity';
import { ChecklistItem } from './entities/checklist-item.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { InternalTask } from './entities/internal-task.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/departments.entiy';
import { TaskColumn } from './entities/task-column.entity';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { ChecklistResponseDto } from './dtos/checklist-response.dto';
import { UpdateTaskChecklistItemDto } from './dtos/task-checklist-item.dto';
import { TaskChecklistProgressDto } from './dtos/task-checklist-item.dto';

@Injectable()
export class ChecklistService {
  constructor(
    @InjectRepository(Checklist)
    private readonly checklistRepository: Repository<Checklist>,
    @InjectRepository(ChecklistItem)
    private readonly checklistItemRepository: Repository<ChecklistItem>,
    @InjectRepository(TaskChecklistItem)
    private readonly taskChecklistItemRepository: Repository<TaskChecklistItem>,
    @InjectRepository(InternalTask)
    private readonly taskRepository: Repository<InternalTask>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(TaskColumn)
    private readonly columnRepository: Repository<TaskColumn>,
  ) {}

  // ============================== CRIAÇÃO DE CHECKLISTS ==============================

  async createChecklist(
    createChecklistDto: CreateChecklistDto,
    currentUser: User,
  ): Promise<ChecklistResponseDto> {
    // Verificar permissão para criar
    await this.checkCreatePermission(currentUser);

    const {
      departmentId,
      items,
      ...checklistData
    } = createChecklistDto;

    // Buscar departamento se fornecido
    let department: Department | null = null;
    if (departmentId) {
      department = await this.departmentRepository.findOne({
        where: { id: departmentId },
      });
      if (!department) {
        throw new NotFoundException('Departamento não encontrado');
      }
    }

    // Criar checklist
    const checklist = this.checklistRepository.create({
      ...checklistData,
      department,
      createdBy: currentUser,
    });

    const savedChecklist = await this.checklistRepository.save(checklist);

    // Criar itens do checklist
    if (items && items.length > 0) {
      const checklistItems = items.map((item, index) => {
        const checklistItem = this.checklistItemRepository.create({
          ...item,
          checklist: savedChecklist,
          order: item.order ?? index,
        });
        return checklistItem;
      });

      await this.checklistItemRepository.save(checklistItems);
    }

    return this.formatChecklistResponse(savedChecklist);
  }

  // ============================== DEBUG - TESTE DIRETO ==============================

  async debugFindAllChecklists(): Promise<any[]> {
    console.log('🔍 Debug - Testando query direta no banco...');
    
    // Query simples sem filtros
    const allChecklists = await this.checklistRepository.find({
      relations: ['department', 'createdBy', 'items']
    });
    
    console.log('🔍 Debug - Total de checklists no banco:', allChecklists.length);
    
    // Log detalhado de cada checklist
    allChecklists.forEach((checklist, index) => {
      console.log(`🔍 Checklist ${index + 1}:`);
      console.log(`  - ID: ${checklist.id}`);
      console.log(`  - Nome: ${checklist.name}`);
      console.log(`  - Department: ${checklist.department?.id || 'NULL'} (${checklist.department?.name || 'SEM DEPARTAMENTO'})`);
      console.log(`  - CreatedBy: ${checklist.createdBy?.id || 'NULL'} (${checklist.createdBy?.name || 'SEM USUÁRIO'})`);
      console.log(`  - IsTemplate: ${checklist.isTemplate}`);
      console.log(`  - IsActive: ${checklist.isActive}`);
    });
    
    return allChecklists;
  }

  async debugFindAllWithFilters(currentUser: User): Promise<any[]> {
    console.log('🔍 Debug - Testando query com verificação de permissão...');
    
    // Verificar permissão para visualizar
    await this.checkViewPermission(currentUser);
    
    const queryBuilder = this.checklistRepository
      .createQueryBuilder('checklist')
      .leftJoinAndSelect('checklist.department', 'department')
      .leftJoinAndSelect('checklist.createdBy', 'createdBy')
      .leftJoinAndSelect('checklist.items', 'items');
    
    console.log('🔍 Debug - Query SQL:', queryBuilder.getSql());
    console.log('🔍 Debug - Parâmetros da query:', queryBuilder.getParameters());
    
    const result = await queryBuilder.getMany();
    console.log('🔍 Debug - Resultado:', result.length, 'itens');
    
    return result;
  }

  // ============================== LISTAGEM DE CHECKLISTS ==============================

  async findAll(
    currentUser: User,
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      type?: ChecklistType;
      isTemplate?: boolean;
      departmentId?: string;
    },
  ): Promise<{
    data: ChecklistResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verificar permissão para visualizar
    await this.checkViewPermission(currentUser);

    console.log('🔍 Debug - Iniciando findAll SEM FILTROS');
    
    // Query SIMPLES sem nenhum filtro - apenas busca todos os checklists
    const allChecklists = await this.checklistRepository.find({
      relations: ['department', 'createdBy', 'items']
    });
    
    console.log('🔍 Debug - Total encontrado no banco:', allChecklists.length);
    
    // Aplicar paginação manualmente
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allChecklists.slice(startIndex, endIndex);
    
    console.log('🔍 Debug - Dados paginados:', paginatedData.length, 'itens');

    const formattedData = await Promise.all(
      paginatedData.map(checklist => this.formatChecklistResponse(checklist))
    );
    
    return { 
      data: formattedData, 
      total: allChecklists.length, 
      page, 
      limit 
    };
  }

  async findTemplates(currentUser: User): Promise<ChecklistResponseDto[]> {
    // Verificar permissão para visualizar
    await this.checkViewPermission(currentUser);

    const checklists = await this.checklistRepository.find({
      where: { isTemplate: true, isActive: true },
      relations: [
        'department',
        'createdBy',
        'items',
        'items.responsible',
      ],
      order: { name: 'ASC' },
    });

    return Promise.all(
      checklists.map(checklist => this.formatChecklistResponse(checklist))
    );
  }

  async findOne(id: string, currentUser: User): Promise<ChecklistResponseDto> {
    // Verificar permissão para visualizar
    await this.checkViewPermission(currentUser);

    const checklist = await this.checklistRepository.findOne({
      where: { id },
      relations: [
        'department',
        'createdBy',
        'items',
        'items.responsible',
      ],
    });

    if (!checklist) {
      throw new NotFoundException('Checklist não encontrado');
    }

    return this.formatChecklistResponse(checklist);
  }

  // ============================== ATUALIZAÇÃO DE CHECKLISTS ==============================

  async update(
    id: string,
    updateChecklistDto: UpdateChecklistDto,
    currentUser: User,
  ): Promise<ChecklistResponseDto> {
    // Verificar permissão para editar
    await this.checkUpdatePermission(currentUser);

    // Buscar checklist como entidade
    const checklist = await this.checklistRepository.findOne({
      where: { id },
      relations: ['department', 'createdBy', 'items'],
    });

    if (!checklist) {
      throw new NotFoundException('Checklist não encontrado');
    }

    const {
      departmentId,
      items,
      ...updateData
    } = updateChecklistDto;

    // Atualizar departamento se fornecido
    if (departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: departmentId },
      });
      if (!department) {
        throw new NotFoundException('Departamento não encontrado');
      }
      checklist.department = department;
    }

    // Atualizar dados do checklist
    Object.assign(checklist, updateData);
    const savedChecklist = await this.checklistRepository.save(checklist);

    // Atualizar itens se fornecidos
    if (items) {
      // Remover itens existentes
      await this.checklistItemRepository.delete({ checklist: { id } });

      // Criar novos itens
      if (items.length > 0) {
        const checklistItems = items.map((item, index) => {
          const checklistItem = this.checklistItemRepository.create({
            ...item,
            checklist: savedChecklist,
            order: item.order ?? index,
          });
          return checklistItem;
        });

        await this.checklistItemRepository.save(checklistItems);
      }
    }

    return this.formatChecklistResponse(savedChecklist);
  }

  async delete(id: string, currentUser: User): Promise<void> {
    // Verificar permissão para excluir
    await this.checkDeletePermission(currentUser);

    // Buscar checklist como entidade
    const checklist = await this.checklistRepository.findOne({
      where: { id },
      relations: ['department', 'createdBy', 'items'],
    });

    if (!checklist) {
      throw new NotFoundException('Checklist não encontrado');
    }

    // Verificar se há tarefas usando este checklist
    const taskCount = await this.taskRepository.count({
      where: { checklist: { id } },
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir o checklist "${checklist.name}" pois ele está sendo usado por ${taskCount} tarefa(s).`,
      );
    }

    await this.checklistRepository.remove(checklist);
  }

  // ============================== GESTÃO DE CHECKLISTS EM TAREFAS ==============================

  async associateChecklistToTask(
    taskId: string,
    checklistId: string,
    currentUser: User,
  ): Promise<void> {
    // Verificar se a tarefa existe e se o usuário tem permissão
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['responsible', 'assistants', 'department'],
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    // Verificar se o checklist existe
    const checklist = await this.checklistRepository.findOne({
      where: { id: checklistId },
      relations: ['items'],
    });

    if (!checklist) {
      throw new NotFoundException('Checklist não encontrado');
    }

    // Verificar se já existem itens de checklist para esta tarefa
    const existingTaskItems = await this.taskChecklistItemRepository.find({
      where: { task: { id: taskId } },
      relations: ['checklistItem'],
    });

    // Se já existem itens, não criar novos
    if (existingTaskItems.length > 0) {
      console.log(`⚠️ Tarefa ${taskId} já possui ${existingTaskItems.length} itens de checklist. Não criando novos itens.`);
      return;
    }

    // Associar checklist à tarefa
    task.checklist = checklist;
    await this.taskRepository.save(task);

    // Criar itens de checklist para a tarefa apenas se não existirem
    const taskChecklistItems = checklist.items.map(item => {
      return this.taskChecklistItemRepository.create({
        task,
        checklistItem: item,
        isCompleted: false,
      });
    });

    await this.taskChecklistItemRepository.save(taskChecklistItems);
    console.log(`✅ Criados ${taskChecklistItems.length} itens de checklist para tarefa ${taskId}`);
  }

  async getTaskChecklist(
    taskId: string,
    currentUser: User,
  ): Promise<{
    checklist: ChecklistResponseDto;
    items: any[];
    progress: TaskChecklistProgressDto;
  }> {
    // Verificar se a tarefa existe e se o usuário tem permissão
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
        'checklist.items',
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

    if (!task.checklist) {
      throw new NotFoundException('Tarefa não possui checklist associado');
    }

    // Formatar itens do checklist da tarefa
    const items = task.checklistItems.map(taskItem => ({
      id: taskItem.id,
      isCompleted: taskItem.isCompleted,
      completedAt: taskItem.completedAt,
      notes: taskItem.notes,
      checklistItem: {
        id: taskItem.checklistItem.id,
        description: taskItem.checklistItem.description,
        observations: taskItem.checklistItem.observations,
        order: taskItem.checklistItem.order,
        isRequired: taskItem.checklistItem.isRequired,
        responsible: taskItem.checklistItem.responsible ? {
          id: taskItem.checklistItem.responsible.id,
          name: taskItem.checklistItem.responsible.name,
          email: taskItem.checklistItem.responsible.email,
        } : null,
      },
      completedBy: taskItem.completedBy ? {
        id: taskItem.completedBy.id,
        name: taskItem.completedBy.name,
        email: taskItem.completedBy.email,
      } : null,
      createdAt: taskItem.createdAt,
      updatedAt: taskItem.updatedAt,
    }));

    // Calcular progresso
    const progress = await this.calculateTaskChecklistProgress(taskId);

    return {
      checklist: await this.formatChecklistResponse(task.checklist),
      items,
      progress,
    };
  }

  async updateTaskChecklistItem(
    taskId: string,
    itemId: string,
    updateDto: UpdateTaskChecklistItemDto,
    currentUser: User,
  ): Promise<any> {
    // Verificar se a tarefa existe e se o usuário tem permissão
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['responsible', 'assistants', 'department'],
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // Verificar permissão para editar a tarefa
    await this.checkTaskEditPermission(currentUser, task);

    // Buscar item do checklist da tarefa
    const taskItem = await this.taskChecklistItemRepository.findOne({
      where: { id: itemId, task: { id: taskId } },
      relations: ['checklistItem', 'completedBy'],
    });

    if (!taskItem) {
      throw new NotFoundException('Item do checklist não encontrado');
    }

    // Atualizar item
    if (updateDto.isCompleted !== undefined) {
      taskItem.isCompleted = updateDto.isCompleted;
      taskItem.completedAt = updateDto.isCompleted ? new Date() : null;
      taskItem.completedBy = updateDto.isCompleted ? currentUser : null;
    }

    if (updateDto.notes !== undefined) {
      taskItem.notes = updateDto.notes;
    }

    const savedItem = await this.taskChecklistItemRepository.save(taskItem);

    // Verificar se o checklist foi completado (sem movimentação automática)
    // await this.checkAndCompleteTask(taskId);

    return {
      id: savedItem.id,
      isCompleted: savedItem.isCompleted,
      completedAt: savedItem.completedAt,
      notes: savedItem.notes,
      checklistItem: {
        id: savedItem.checklistItem.id,
        description: savedItem.checklistItem.description,
        observations: savedItem.checklistItem.observations,
        order: savedItem.checklistItem.order,
        isRequired: savedItem.checklistItem.isRequired,
      },
      completedBy: savedItem.completedBy ? {
        id: savedItem.completedBy.id,
        name: savedItem.completedBy.name,
        email: savedItem.completedBy.email,
      } : null,
      createdAt: savedItem.createdAt,
      updatedAt: savedItem.updatedAt,
    };
  }

  async calculateTaskChecklistProgress(taskId: string): Promise<TaskChecklistProgressDto> {
    const taskItems = await this.taskChecklistItemRepository.find({
      where: { task: { id: taskId } },
      relations: ['checklistItem'],
    });

    const totalItems = taskItems.length;
    const completedItems = taskItems.filter(item => item.isCompleted).length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Verificar se todos os itens obrigatórios foram concluídos
    const requiredItems = taskItems.filter(item => item.checklistItem.isRequired);
    const requiredItemsCompleted = requiredItems.every(item => item.isCompleted);

    // Uma tarefa pode ser concluída se todos os itens obrigatórios foram finalizados
    const canCompleteTask = requiredItemsCompleted;

    return {
      totalItems,
      completedItems,
      progress: Math.round(progress * 100) / 100, // Arredondar para 2 casas decimais
      requiredItemsCompleted,
      canCompleteTask,
    };
  }

  // ============================== PERMISSÕES ==============================

  /**
   * Verifica se o usuário tem permissão para visualizar checklists
   */
  private async checkViewPermission(currentUser: User): Promise<void> {
    const hasPermission = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => 
          roleRule.rule?.rule === 'administrator' ||
          roleRule.rule?.rule === 'checklists.view'
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar checklists.',
      );
    }
  }

  /**
   * Verifica se o usuário tem permissão para criar checklists
   */
  private async checkCreatePermission(currentUser: User): Promise<void> {
    const hasPermission = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => 
          roleRule.rule?.rule === 'administrator' ||
          roleRule.rule?.rule === 'checklists.create'
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem permissão para criar checklists.',
      );
    }
  }

  /**
   * Verifica se o usuário tem permissão para editar checklists
   */
  private async checkUpdatePermission(currentUser: User): Promise<void> {
    const hasPermission = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => 
          roleRule.rule?.rule === 'administrator' ||
          roleRule.rule?.rule === 'checklists.update'
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem permissão para editar checklists.',
      );
    }
  }

  /**
   * Verifica se o usuário tem permissão para excluir checklists
   */
  private async checkDeletePermission(currentUser: User): Promise<void> {
    const hasPermission = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => 
          roleRule.rule?.rule === 'administrator' ||
          roleRule.rule?.rule === 'checklists.delete'
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir checklists.',
      );
    }
  }

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

    if (isAdmin) {
      return;
    }

    // Verificar se é o criador da tarefa
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

    throw new ForbiddenException('Sem permissão para visualizar esta tarefa');
  }

  private async checkTaskEditPermission(
    currentUser: User,
    task: InternalTask,
  ): Promise<void> {
    // Verificar se o usuário é administrador
    const isAdmin = currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    if (isAdmin) {
      return;
    }

    // Verificar se é o criador da tarefa
    if (task.createdBy?.id === currentUser.id) {
      return;
    }

    // Verificar se é o responsável pela tarefa
    if (task.responsible?.id === currentUser.id) {
      return;
    }

    // Verificar se é assistente da tarefa
    const isAssistant = task.assistants?.some(
      (assistant) => assistant.id === currentUser.id,
    );

    if (isAssistant) {
      return;
    }

    // Verificar se é gestor do departamento da tarefa
    const userDepartments =
      currentUser.userRoles?.flatMap(
        (userRole) =>
          userRole.role?.roleDepartments?.map((rd) => rd.department.id) || [],
      ) || [];

    if (userDepartments.includes(task.department?.id)) {
      const hasManagementRule = currentUser.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) => roleRule.rule?.rule === 'department-manager',
        ),
      );

      if (hasManagementRule) {
        return;
      }
    }

    throw new ForbiddenException(
      'Você não tem permissão para editar esta tarefa.',
    );
  }

  // ============================== CONCLUSÃO AUTOMÁTICA DE TAREFAS ==============================

  // FUNÇÃO DESABILITADA - Movimentação automática de tarefas removida
  // private async checkAndCompleteTask(taskId: string): Promise<void> {
  //   try {
  //     // Buscar a tarefa com seus itens de checklist
  //     const task = await this.taskRepository.findOne({
  //       where: { id: taskId },
  //       relations: ['checklistItems', 'checklistItems.checklistItem'],
  //     });

  //     if (!task || !task.checklistItems || task.checklistItems.length === 0) {
  //       return; // Tarefa não tem checklist
  //     }

  //     // Verificar se todos os itens obrigatórios foram completados
  //     const requiredItems = task.checklistItems.filter(item => item.checklistItem.isRequired);
  //     const completedRequiredItems = requiredItems.filter(item => item.isCompleted);

  //     // Se todos os itens obrigatórios foram completados, marcar a tarefa como completa
  //     if (requiredItems.length > 0 && completedRequiredItems.length === requiredItems.length) {
  //       // Buscar a coluna de conclusão "Feito"
  //       const completedColumn = await this.columnRepository
  //         .createQueryBuilder('column')
  //         .where('column.name = :name', {
  //           name: 'Feito'
  //         })
  //         .getOne();

  //       if (completedColumn) {
  //         task.column = completedColumn;
  //         await this.taskRepository.save(task);
          
  //         console.log(`✅ Tarefa ${taskId} movida para coluna "${completedColumn.name}" automaticamente`);
  //       } else {
  //         // Log para debug: mostrar todas as colunas disponíveis
  //         const allColumns = await this.columnRepository.find();
  //         console.log(`⚠️ Coluna de conclusão não encontrada. Colunas disponíveis:`, allColumns.map(c => c.name));
  //         console.log(`⚠️ Tarefa ${taskId} não foi movida automaticamente.`);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Erro ao verificar conclusão automática da tarefa:', error);
  //   }
  // }

  // ============================== UTILITÁRIOS ==============================

  private async formatChecklistResponse(checklist: Checklist): Promise<ChecklistResponseDto> {
    const totalItems = checklist.items?.length || 0;
    const completedItems = 0; // Para checklists gerais, sempre 0
    const progress = totalItems > 0 ? 0 : 100;

    return {
      id: checklist.id,
      name: checklist.name,
      description: checklist.description,
      type: checklist.type,
      isTemplate: checklist.isTemplate,
      isActive: checklist.isActive,
      department: checklist.department ? {
        id: checklist.department.id,
        name: checklist.department.name,
      } : null,
      createdBy: checklist.createdBy ? {
        id: checklist.createdBy.id,
        name: checklist.createdBy.name,
        email: checklist.createdBy.email,
      } : null,
      items: checklist.items?.map(item => ({
        id: item.id,
        description: item.description,
        observations: item.observations,
        order: item.order,
        isRequired: item.isRequired,
        responsible: item.responsible ? {
          id: item.responsible.id,
          name: item.responsible.name,
          email: item.responsible.email,
        } : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) || [],
      totalItems,
      completedItems,
      progress,
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt,
    };
  }
}
