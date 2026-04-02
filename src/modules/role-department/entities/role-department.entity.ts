import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/roles.entities';
import { Department } from '../../departments/entities/departments.entiy';

// RoleDepartment Entity
@Entity('role_department')
export class RoleDepartment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.roleDepartments)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Department, (department) => department.roleDepartments)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
  })
  deletedAt: Date;
}
