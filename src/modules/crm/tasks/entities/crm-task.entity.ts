import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  DeleteDateColumn,
} from 'typeorm';
import { CrmNegotiation } from '../../negotiations/entities/crm-negotiation.entity';
import { CrmCompany } from '../../companies/entities/crm-company.entity';
import { CrmContact } from '../../contacts/entities/crm-contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { CrmTaskRecurrence } from './crm-task-recurrence.entity';

export enum TaskType {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  WHATSAPP = 'WHATSAPP',
  FOLLOW_UP = 'FOLLOW_UP',
  ONBOARDING = 'ONBOARDING',
  IN_PERSON_VISIT = 'IN_PERSON_VISIT',
  TASK = 'TASK',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  LATE = 'LATE',
  SCHEDULED = 'SCHEDULED',
}

@Entity('crm_tasks')
export class CrmTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.TASK,
  })
  type: TaskType;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp' })
  scheduledDate: Date;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @ManyToOne(() => User)
  owner: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'crm_tasks_users',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  auxiliaryUsers: User[];

  @ManyToOne(() => CrmNegotiation, { nullable: true })
  negotiation: CrmNegotiation;

  @ManyToOne(() => CrmCompany, { nullable: true })
  company: CrmCompany;

  @ManyToOne(() => CrmContact, { nullable: true })
  contact: CrmContact;

  @OneToOne(() => CrmTaskRecurrence, (recurrence) => recurrence.task, {
    nullable: true,
  })
  recurrence: CrmTaskRecurrence;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
