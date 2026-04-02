import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskKanban } from '../modules/internal-tasks/entities/task-kanban.entity';
import { TaskColumn } from '../modules/internal-tasks/entities/task-column.entity';
import {
  InternalTask,
  TaskPriority,
} from '../modules/internal-tasks/entities/internal-task.entity';
import { Department } from '../modules/departments/entities/departments.entiy';
import { User } from '../modules/users/entities/user.entity';
import { Company } from '../modules/companies/entities/companies.entity';

@Injectable()
export class InternalTasksSeeder {
  constructor(
    @InjectRepository(TaskKanban)
    private readonly kanbanRepository: Repository<TaskKanban>,
    @InjectRepository(TaskColumn)
    private readonly columnRepository: Repository<TaskColumn>,
    @InjectRepository(InternalTask)
    private readonly taskRepository: Repository<InternalTask>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async seed(): Promise<void> {
    try {
      console.log('🌱 Starting InternalTasks seeder...');

      // VERIFICAR SE JÁ EXISTEM DADOS
      const existingKanbans = await this.kanbanRepository.count();
      if (existingKanbans > 0) {
        console.log(
          '⚠️  Internal tasks data already exists. Skipping seeding.',
        );
        return;
      }

      console.log('🧹 Starting fresh seeding...');

      // Criar kanbans padrão para cada departamento
      const createdKanbans = await this.createDefaultKanbans();

      // Criar tarefas de exemplo
      await this.createSampleTasks(createdKanbans);

      console.log('🎉 InternalTasks seeder completed successfully!');
    } catch (error) {
      console.error('❌ Error in InternalTasks seeder:', error);
      throw error;
    }
  }

  private async createDefaultKanbans(): Promise<
    { kanban: TaskKanban; columns: TaskColumn[] }[]
  > {
    // Buscar departamentos existentes
    const departments = await this.departmentRepository.find();

    if (departments.length === 0) {
      console.log('⚠️  No departments found. Skipping internal tasks seeding.');
      return [];
    }

    // CRIAR APENAS 1 KANBAN PRINCIPAL PARA A EMPRESA
    console.log('🎯 Creating single company kanban...');
    const defaultDepartment = departments[0]; // Usar apenas o primeiro departamento

    const result = await this.createDefaultKanban(defaultDepartment);
    return [result]; // Retornar apenas 1 kanban
  }

  private async createDefaultKanban(department: Department) {
    // Criar kanban principal da empresa
    const kanban = this.kanbanRepository.create({
      name: `Quadro Principal da Empresa`,
      description: `Kanban principal para todas as tarefas da empresa`,
      department,
      isDefault: true,
    });

    const savedKanban = await this.kanbanRepository.save(kanban);

    // Criar colunas padrão para o kanban
    const defaultColumns = [
      { name: 'A Fazer', color: '#1976d2', order: 1, isDefault: true },
      { name: 'Fazendo', color: '#f57c00', order: 2, isDefault: true },
      { name: 'Feito', color: '#388e3c', order: 3, isDefault: true },
    ];

    // PRIMEIRO: Salvar todas as colunas e obter seus IDs
    const savedColumns = [];
    for (const columnData of defaultColumns) {
      const column = this.columnRepository.create({
        ...columnData,
        kanban: savedKanban,
      });
      const savedColumn = await this.columnRepository.save(column);
      savedColumns.push(savedColumn);
      console.log(
        `📋 Created column: ${savedColumn.name} with ID: ${savedColumn.id}`,
      );
    }

    console.log(`📋 Created default kanban for department: ${department.name}`);

    // Retornar o kanban com as colunas salvas para uso posterior
    return { kanban: savedKanban, columns: savedColumns };
  }

  private async createSampleTasks(
    createdKanbans: { kanban: TaskKanban; columns: TaskColumn[] }[],
  ) {
    try {
      // Buscar usuários e empresas para criar tarefas
      const users = await this.userRepository.find({ take: 5 });
      const companies = await this.companyRepository.find({ take: 3 });

      if (
        users.length === 0 ||
        companies.length === 0 ||
        createdKanbans.length === 0
      ) {
        console.log(
          '⚠️  Missing users, companies, or kanbans. Skipping sample tasks creation.',
        );
        return;
      }

      // Usar o primeiro kanban criado
      const firstKanban = createdKanbans[0];
      console.log(
        `📋 Using kanban: ${firstKanban.kanban.name} with ${firstKanban.columns.length} columns`,
      );

      // Buscar especificamente o usuário contato@soluconte.com.br
      const primaryUser = await this.userRepository.findOne({
        where: { email: 'contato@soluconte.com.br' },
      });

      if (!primaryUser) {
        console.log(
          '⚠️  User contato@soluconte.com.br not found. Using first available user.',
        );
        const fallbackUser = users[0];
        console.log(
          `👤 Fallback user for tasks: ${fallbackUser.name} ${fallbackUser.lastName} (ID: ${fallbackUser.id})`,
        );
      } else {
        console.log(
          `👤 Primary user for tasks: ${primaryUser.name} ${primaryUser.lastName} (ID: ${primaryUser.id}) - ${primaryUser.email}`,
        );
      }

      const responsibleUser = primaryUser || users[0];

      // Criar algumas tarefas de teste usando as colunas criadas
      const sampleTasks = [
        {
          title: 'Implementar sistema de login',
          description: 'Criar sistema de autenticação com JWT',
          priority: TaskPriority.HIGH,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
          scheduledDate: new Date(),
          customer: companies[0],
          department: firstKanban.kanban.department,
          responsible: responsibleUser,
          kanban: firstKanban.kanban,
          column: firstKanban.columns[0], // Primeira coluna (A Fazer)
          order: 1,
        },
        {
          title: 'Configurar banco de dados',
          description: 'Configurar conexão com MySQL e criar tabelas',
          priority: TaskPriority.MEDIUM,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
          scheduledDate: new Date(),
          customer: companies[1],
          department: firstKanban.kanban.department,
          responsible: responsibleUser,
          kanban: firstKanban.kanban,
          column: firstKanban.columns[1], // Segunda coluna (Fazendo)
          order: 1,
        },
        {
          title: 'Testar funcionalidades',
          description: 'Realizar testes unitários e de integração',
          priority: TaskPriority.LOW,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 dias
          scheduledDate: new Date(),
          customer: companies[2],
          department: firstKanban.kanban.department,
          responsible: responsibleUser,
          kanban: firstKanban.kanban,
          column: firstKanban.columns[2], // Terceira coluna (Feito)
          order: 1,
        },
      ];

      for (const taskData of sampleTasks) {
        try {
          // Criar tarefa usando save diretamente com IDs
          const task = this.taskRepository.create({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            scheduledDate: taskData.scheduledDate,
            order: taskData.order,
            customer: { id: taskData.customer.id },
            department: { id: taskData.department.id },
            responsible: { id: taskData.responsible.id },
            kanban: { id: taskData.kanban.id },
            column: { id: taskData.column.id },
          });

          await this.taskRepository.save(task);
          console.log(`✅ Created task: ${taskData.title}`);
        } catch (error) {
          console.error(
            `❌ Error creating task "${taskData.title}":`,
            error.message,
          );
        }
      }

      console.log('📝 Created sample tasks for testing');
    } catch (error) {
      console.error('❌ Error creating sample tasks:', error);
    }
  }
}
