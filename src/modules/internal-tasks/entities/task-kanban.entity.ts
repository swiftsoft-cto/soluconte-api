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
import { Department } from '../../departments/entities/departments.entiy';
import { TaskColumn } from './task-column.entity';
import { InternalTask } from './internal-task.entity';

@Entity('task_kanbans')
export class TaskKanban {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  // Relacionamentos
  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => TaskColumn, (column) => column.kanban, {
    cascade: true,
  })
  columns: TaskColumn[];

  @OneToMany(() => InternalTask, (task) => task.kanban)
  tasks: InternalTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
