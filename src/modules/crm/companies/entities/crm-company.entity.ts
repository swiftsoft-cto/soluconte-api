import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { CrmContact } from '../../contacts/entities/crm-contact.entity';

@Entity('crm_companies')
export class CrmCompany {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 18, unique: true, nullable: true })
  cnpj: string;

  @Column({ length: 256 })
  razaoSocial: string;

  @Column({ length: 256 })
  nomeFantasia: string;

  @Column({ length: 50 })
  situacao: string;

  @Column({ length: 50 })
  tipoEmpresa: string;

  @Column({ length: 50 })
  porte: string;

  @Column({ length: 100 })
  naturezaJuridica: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  capitalSocial: number;

  @Column({ length: 256 })
  atividadePrincipal: string;

  @Column('simple-array')
  atividadesSecundarias: string[];

  @Column({ length: 256, nullable: true })
  url?: string;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @OneToMany(() => CrmContact, (contact) => contact.company)
  contacts: CrmContact[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
