import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Department } from '../../departments/entities/departments.entiy';
import { Company } from '../../companies/entities/companies.entity';
import { User } from '../../users/entities/user.entity';
import { DepartmentFile } from './department-file.entity';

@Entity('department_folders')
export class DepartmentFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string; // Nome da pasta

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Departamento ao qual a pasta pertence
  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  // Cliente vinculado (opcional - se null, é pasta interna do departamento)
  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  // Usuário que criou a pasta
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Arquivos dentro desta pasta
  @OneToMany(() => DepartmentFile, (file) => file.folder)
  files: DepartmentFile[];
}
