import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmTask } from './entities/crm-task.entity';
import { CreateCrmTaskDto } from './dtos/create-crm-task.dto';
import { UpdateCrmTaskDto } from './dtos/update-crm-task.dto';
import { CrmNegotiation } from '../negotiations/entities/crm-negotiation.entity';
import { CrmCompany } from '../companies/entities/crm-company.entity';
import { CrmContact } from '../contacts/entities/crm-contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { CrmTaskRecurrence } from './entities/crm-task-recurrence.entity';

@Injectable()
export class CrmTasksService {
  constructor(
    @InjectRepository(CrmTask)
    private readonly taskRepository: Repository<CrmTask>,
    @InjectRepository(CrmNegotiation)
    private readonly negotiationRepository: Repository<CrmNegotiation>,
    @InjectRepository(CrmCompany)
    private readonly companyRepository: Repository<CrmCompany>,
    @InjectRepository(CrmContact)
    private readonly contactRepository: Repository<CrmContact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CrmTaskRecurrence)
    private readonly recurrenceRepository: Repository<CrmTaskRecurrence>,
  ) {}

  async create(createCrmTaskDto: CreateCrmTaskDto) {
    console.log('meu dto', createCrmTaskDto);
    const task = new CrmTask();

    // Mapear campos básicos
    Object.assign(task, createCrmTaskDto);

    // Mapear relacionamentos
    if (createCrmTaskDto.negotiationId) {
      task.negotiation = await this.negotiationRepository.findOne({
        where: { id: createCrmTaskDto.negotiationId },
      });
    }

    if (createCrmTaskDto.companyId) {
      task.company = await this.companyRepository.findOne({
        where: { id: createCrmTaskDto.companyId },
      });
    }

    if (createCrmTaskDto.contactId) {
      task.contact = await this.contactRepository.findOne({
        where: { id: createCrmTaskDto.contactId },
      });
    }

    if (createCrmTaskDto.ownerId) {
      task.owner = await this.userRepository.findOne({
        where: { id: createCrmTaskDto.ownerId },
      });
    }

    if (createCrmTaskDto.userIds && createCrmTaskDto.userIds.length > 0) {
      task.auxiliaryUsers = await this.userRepository.findByIds(
        createCrmTaskDto.userIds,
      );
    }

    // Remover campos ID antes de salvar
    const { recurrence, ...taskData } = createCrmTaskDto;
    Object.assign(task, taskData);

    // Salvar a tarefa primeiro
    const savedTask = await this.taskRepository.save(task);

    // Se houver recorrência, criar o registro
    if (recurrence) {
      const recurrenceEntity = this.recurrenceRepository.create({
        ...recurrence,
        task: savedTask,
      });
      await this.recurrenceRepository.save(recurrenceEntity);
    }

    return this.findOne(savedTask.id);
  }

  async findAll(query: any) {
    const {
      page = 1,
      limit = 10,
      filter,
      status,
      userId,
      ownerId,
      startDate,
      endDate,
      negotiationId,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.owner', 'owner')
      .leftJoinAndSelect('task.auxiliaryUsers', 'auxiliaryUsers')
      .leftJoinAndSelect('task.negotiation', 'negotiation')
      .leftJoinAndSelect('task.company', 'company')
      .leftJoinAndSelect('task.contact', 'contact')
      .leftJoinAndSelect('task.recurrence', 'recurrence');

    if (filter) {
      queryBuilder.where(
        'task.title LIKE :filter OR task.description LIKE :filter',
        {
          filter: `%${filter}%`,
        },
      );
    }

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere(
        '(owner.id = :userId OR auxiliaryUsers.id = :userId)',
        { userId },
      );
    }

    // Filtro por responsável (owner)
    if (ownerId) {
      queryBuilder.andWhere('owner.id = :ownerId', { ownerId });
    }

    // Filtro por negociação
    if (negotiationId) {
      queryBuilder.andWhere('negotiation.id = :negotiationId', {
        negotiationId,
      });
    }

    // Filtro por data de início
    if (startDate) {
      queryBuilder.andWhere('DATE(task.scheduledDate) >= :startDate', {
        startDate: startDate,
      });
    }

    // Filtro por data de fim
    if (endDate) {
      queryBuilder.andWhere('DATE(task.scheduledDate) <= :endDate', {
        endDate: endDate,
      });
    }

    const [tasks, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'owner',
        'auxiliaryUsers',
        'negotiation',
        'company',
        'contact',
        'recurrence',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateCrmTaskDto: UpdateCrmTaskDto) {
    const task = await this.findOne(id);

    // Mapear campos básicos
    Object.assign(task, updateCrmTaskDto);

    // Mapear relacionamentos
    if (updateCrmTaskDto.negotiationId) {
      task.negotiation = await this.negotiationRepository.findOne({
        where: { id: updateCrmTaskDto.negotiationId },
      });
    }

    if (updateCrmTaskDto.companyId) {
      task.company = await this.companyRepository.findOne({
        where: { id: updateCrmTaskDto.companyId },
      });
    }

    if (updateCrmTaskDto.contactId) {
      task.contact = await this.contactRepository.findOne({
        where: { id: updateCrmTaskDto.contactId },
      });
    }

    if (updateCrmTaskDto.ownerId) {
      task.owner = await this.userRepository.findOne({
        where: { id: updateCrmTaskDto.ownerId },
      });
    }

    if (updateCrmTaskDto.userIds && updateCrmTaskDto.userIds.length > 0) {
      task.auxiliaryUsers = await this.userRepository.findByIds(
        updateCrmTaskDto.userIds,
      );
    }

    // Remover campos ID antes de salvar
    const { recurrence, ...taskData } = updateCrmTaskDto;
    Object.assign(task, taskData);

    // Salvar a tarefa primeiro
    const savedTask = await this.taskRepository.save(task);

    // Se houver recorrência, atualizar ou criar o registro
    if (recurrence) {
      // Buscar recorrência existente
      const existingRecurrence = await this.recurrenceRepository.findOne({
        where: { task: { id: savedTask.id } },
      });

      if (existingRecurrence) {
        // Atualizar recorrência existente
        Object.assign(existingRecurrence, recurrence);
        await this.recurrenceRepository.save(existingRecurrence);
      } else {
        // Criar nova recorrência
        const recurrenceEntity = this.recurrenceRepository.create({
          ...recurrence,
          task: savedTask,
        });
        await this.recurrenceRepository.save(recurrenceEntity);
      }
    }

    return this.findOne(savedTask.id);
  }

  async remove(id: string) {
    return this.taskRepository.softDelete(id);
  }
}
