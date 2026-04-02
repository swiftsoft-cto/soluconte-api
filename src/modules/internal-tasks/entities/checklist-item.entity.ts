import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Checklist } from './checklist.entity';
import { TaskChecklistItem } from './task-checklist-item.entity';

@Entity('checklist_items')
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 512 })
  description: string;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: false })
  isRequired: boolean; // Se o item é obrigatório para conclusão da tarefa

  // Relacionamentos
  @ManyToOne(() => Checklist, (checklist) => checklist.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checklist_id' })
  checklist: Checklist;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_id' })
  responsible: User; // Responsável específico pelo item

  @OneToMany(() => TaskChecklistItem, (taskItem) => taskItem.checklistItem)
  taskItems: TaskChecklistItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}










