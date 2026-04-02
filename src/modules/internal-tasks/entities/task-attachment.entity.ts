import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { InternalTask } from './internal-task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('task_attachments')
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  filename: string;

  @Column({ length: 256 })
  originalName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ length: 512 })
  url: string;

  // Relacionamentos
  @ManyToOne(() => InternalTask, { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task: InternalTask;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
