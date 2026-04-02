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
import { Department } from '../../departments/entities/departments.entiy';
import { ChecklistItem } from './checklist-item.entity';
import { InternalTask } from './internal-task.entity';

export enum ChecklistType {
  PROCESS = 'PROCESS', // Checklist de processo (abertura de empresa, alteração contratual)
  ROUTINE = 'ROUTINE', // Checklist de rotina (uso geral)
  DAILY_ROUTINE = 'DAILY_ROUTINE', // Checklist de rotina diária
}

@Entity('checklists')
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ChecklistType,
    default: ChecklistType.PROCESS,
  })
  type: ChecklistType;

  @Column({ default: false })
  isTemplate: boolean; // Se é um template reutilizável

  @Column({ default: false })
  isActive: boolean;

  // Relacionamentos
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department; // Departamento associado (opcional)

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => ChecklistItem, (item) => item.checklist, {
    cascade: true,
    eager: true,
  })
  items: ChecklistItem[];

  @OneToMany(() => InternalTask, (task) => task.checklist)
  tasks: InternalTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}










