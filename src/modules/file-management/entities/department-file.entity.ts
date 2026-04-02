import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DepartmentFolder } from './department-folder.entity';
import { User } from '../../users/entities/user.entity';

@Entity('department_files')
export class DepartmentFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 512 })
  filename: string;

  @Column({ length: 512 })
  originalName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ length: 512 })
  url: string; // URL completa do arquivo no storage

  @Column({ length: 512 })
  path: string; // Caminho no storage: department-files/departmentId/folderId/year/month/filename

  // Pasta à qual o arquivo pertence
  @ManyToOne(() => DepartmentFolder, { nullable: false })
  @JoinColumn({ name: 'folder_id' })
  folder: DepartmentFolder;

  @Column({ type: 'int' })
  year: number; // Ano (ex: 2024)

  @Column({ type: 'int' })
  month: number; // Mês (1-12)

  // Usuário que fez upload
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
