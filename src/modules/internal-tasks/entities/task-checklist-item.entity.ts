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
import { User } from '../../users/entities/user.entity';
import { InternalTask } from './internal-task.entity';
import { ChecklistItem } from './checklist-item.entity';

@Entity('task_checklist_items')
export class TaskChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string; // Observações específicas da execução

  // Relacionamentos
  @ManyToOne(() => InternalTask, (task) => task.checklistItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: InternalTask;

  @ManyToOne(() => ChecklistItem, (item) => item.taskItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checklist_item_id' })
  checklistItem: ChecklistItem;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy: User; // Quem marcou como concluído

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}


































