import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Department } from 'src/modules/departments/entities/departments.entiy';
import { CompanyService } from 'src/modules/company-services/entities/company-services.entity';
import { User } from '../../users/entities/user.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ length: 256, nullable: true })
  description: string;

  @Column({ length: 20, nullable: true })
  cnpj: string;

  @Column({ length: 512, nullable: true })
  imageUrl?: string;

  @Column({ length: 256, nullable: true })
  businessName: string;

  @Column({ length: 256, nullable: true })
  tradeName: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ length: 50, nullable: true })
  companyType: string;

  @Column({ length: 100, nullable: true })
  size: string;

  @Column({ length: 256, nullable: true })
  legalNature: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capital: number;

  @Column({ length: 256, nullable: true })
  mainActivity: string;

  @Column({ type: 'json', nullable: true })
  secondaryActivities: string[];

  @Column({ length: 256, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 256, nullable: true })
  address: string;

  @Column({ length: 256, nullable: true })
  neighborhood: string;

  @Column({ length: 256, nullable: true })
  city: string;

  @Column({ length: 2, nullable: true })
  state: string;

  @Column({ length: 10, nullable: true })
  zipCode: string;

  @Column({ type: 'boolean', nullable: true })
  simpleOption: boolean;

  @Column({ type: 'boolean', nullable: true })
  simeiOption: boolean;

  /** Onde o chat de IA aparece: chat_page_only | floating_all. floatingAgentIds = IDs dos agentes no balão (quando floating_all). */
  @Column({ type: 'json', nullable: true })
  chatSettings: { visibility?: 'chat_page_only' | 'floating_all'; floatingAgentIds?: string[] } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  // Relacionamentos
  @OneToMany(() => Department, (department) => department.company)
  departments: Department[];

  // Relacionamento com os usuários
  @OneToMany(() => User, (user) => user.selectedCompany)
  users: User[];

  // Relacionamento com a tabela pivô:
  @OneToMany(() => CompanyService, (companyService) => companyService.company)
  companyServices: CompanyService[];
}
