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
import { Company } from '../../companies/entities/companies.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/departments.entiy';

@Entity('client_files')
export class ClientFile {
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
  path: string; // Caminho no storage: cliente/departamento|geral/ano/mes/filename

  // Estrutura hierárquica: Cliente → Departamento (opcional) → Ano → Mês → Arquivo
  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null; // null = "Geral" (compatível com arquivos antigos)

  @Column({ type: 'int' })
  year: number; // Ano (ex: 2024)

  @Column({ type: 'int' })
  month: number; // Mês (1-12)

  // Usuário que fez upload (apenas interno pode fazer upload)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  sendToClient: boolean; // Se true, arquivo é visível para o cliente e envia notificações

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}


















