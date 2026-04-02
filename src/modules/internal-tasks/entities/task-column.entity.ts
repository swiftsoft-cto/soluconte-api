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
import { TaskKanban } from './task-kanban.entity';
import { InternalTask } from './internal-task.entity';

@Entity('task_columns')
export class TaskColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ length: 7, default: '#1976d2' }) // Cor em formato hex
  color: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  // Relacionamentos
  @ManyToOne(() => TaskKanban, { nullable: false })
  @JoinColumn({ name: 'kanban_id' })
  kanban: TaskKanban;

  @OneToMany(() => InternalTask, (task) => task.column)
  tasks: InternalTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
