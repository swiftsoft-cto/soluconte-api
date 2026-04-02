import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/departments.entiy';
import { Company } from '../../companies/entities/companies.entity';
import { Service } from '../../services/entities/services.entity';
import { TaskKanban } from './task-kanban.entity';
import { TaskColumn } from './task-column.entity';
import { TaskComment } from './task-comment.entity';
import { TaskAttachment } from './task-attachment.entity';
import { Checklist } from './checklist.entity';
import { TaskChecklistItem } from './task-checklist-item.entity';
import { TaskTimeEntry } from './task-time-entry.entity';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum InternalTaskRecurrenceType {
  DAILY = 'DAILY', // Diária
  WEEKLY = 'WEEKLY', // Semanal
  MONTHLY = 'MONTHLY', // Mensal
  YEARLY = 'YEARLY', // Anual
}

@Entity('internal_tasks')
export class InternalTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ type: 'int', default: 0 })
  order: number;

  // Relacionamentos principais
  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Company;

  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_id' })
  responsible: User;

  // Corresponsável da tarefa
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_responsible_id' })
  coResponsible: User;

  // Criador da tarefa
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'internal_tasks_assistants',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assistants: User[];

  @ManyToOne(() => TaskKanban, { nullable: false })
  @JoinColumn({ name: 'kanban_id' })
  kanban: TaskKanban;

  @ManyToOne(() => TaskColumn, { nullable: false })
  @JoinColumn({ name: 'column_id' })
  column: TaskColumn;

  // Relacionamentos de metadados
  @OneToMany(() => TaskComment, (comment) => comment.task, {
    cascade: true,
  })
  comments: TaskComment[];

  @OneToMany(() => TaskAttachment, (attachment) => attachment.task, {
    cascade: true,
  })
  attachments: TaskAttachment[];

  // Relacionamento com checklist
  @ManyToOne(() => Checklist, { nullable: true })
  @JoinColumn({ name: 'checklist_id' })
  checklist: Checklist;

  // Relacionamento com serviço
  @ManyToOne(() => Service, { nullable: true })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @OneToMany(() => TaskChecklistItem, (item) => item.task, {
    cascade: true,
  })
  checklistItems: TaskChecklistItem[];

  @OneToMany(() => TaskTimeEntry, (entry) => entry.task, {
    cascade: true,
  })
  timeEntries: TaskTimeEntry[];

  // Campos de recorrência
  @Column({ default: false, name: 'is_recurrent' })
  isRecurrent: boolean;

  @Column({
    type: 'enum',
    enum: InternalTaskRecurrenceType,
    nullable: true,
    name: 'recurrence_type',
  })
  recurrenceType?: InternalTaskRecurrenceType;

  @Column({ type: 'int', nullable: true, name: 'recurrence_interval' })
  recurrenceInterval?: number; // A cada X dias/semanas/meses (ex: a cada 2 semanas)

  @Column({ type: 'int', nullable: true, name: 'recurrence_day_of_month' })
  recurrenceDayOfMonth?: number; // Dia do mês (1-31) para recorrência mensal

  @Column({
    type: 'simple-array',
    nullable: true,
    name: 'recurrence_days_of_week',
  })
  recurrenceDaysOfWeek?: string[]; // Dias da semana (0-6, domingo=0) para recorrência semanal

  @Column({ type: 'timestamp', nullable: true, name: 'last_recurrence_date' })
  lastRecurrenceDate?: Date; // Data da última tarefa gerada

  @Column({ type: 'timestamp', nullable: true, name: 'next_recurrence_date' })
  nextRecurrenceDate?: Date; // Próxima data de recorrência

  @Column({ type: 'timestamp', nullable: true, name: 'recurrence_end_date' })
  recurrenceEndDate?: Date; // Data limite para parar a recorrência (opcional)

  @Column({ default: false, name: 'is_global_recurrent' })
  isGlobalRecurrent: boolean; // Se é tarefa padrão (global) ou por cliente

  @Column({ type: 'uuid', nullable: true, name: 'parent_recurrent_task_id' })
  parentRecurrentTaskId?: string; // ID da tarefa pai que gerou esta (para rastrear origem)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Template fields
  @Column({ type: 'boolean', default: false, name: 'is_template' })
  isTemplate: boolean;

  @Column({
    type: 'varchar',
    length: 256,
    nullable: true,
    name: 'template_name',
  })
  templateName?: string;

  @Column({ type: 'text', nullable: true, name: 'template_description' })
  templateDescription?: string;

  @Column({
    type: 'enum',
    enum: ['personal', 'company', 'global'],
    nullable: true,
    name: 'template_scope',
  })
  templateScope?: 'personal' | 'company' | 'global';

  @Column({ type: 'uuid', nullable: true, name: 'created_from_template_id' })
  createdFromTemplateId?: string;
}
