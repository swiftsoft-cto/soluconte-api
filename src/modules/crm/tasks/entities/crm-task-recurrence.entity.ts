import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CrmTask } from './crm-task.entity';

export enum RecurrenceType {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum NotificationTime {
  FIVE_MINUTES = 'FIVE_MINUTES',
  TEN_MINUTES = 'TEN_MINUTES',
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',
  THIRTY_MINUTES = 'THIRTY_MINUTES',
  ONE_HOUR = 'ONE_HOUR',
  ONE_HOUR_THIRTY = 'ONE_HOUR_THIRTY',
  TWO_HOURS = 'TWO_HOURS',
  THREE_HOURS = 'THREE_HOURS',
}

@Entity('crm_task_recurrences')
export class CrmTaskRecurrence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
  })
  type: RecurrenceType;

  @Column('simple-array', { nullable: true })
  weekDays: number[];

  @Column('simple-array', { nullable: true })
  monthDays: number[];

  @Column({ nullable: true })
  hour: number;

  @Column({ nullable: true })
  minute: number;

  @Column({
    type: 'enum',
    enum: NotificationTime,
    nullable: true,
  })
  notificationTime: NotificationTime;

  @OneToOne(() => CrmTask, (task) => task.recurrence)
  @JoinColumn()
  task: CrmTask;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
