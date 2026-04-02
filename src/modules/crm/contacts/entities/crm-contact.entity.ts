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
import { CrmCompany } from '../../companies/entities/crm-company.entity';

@Entity('crm_contacts')
export class CrmContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ length: 256 })
  lastname: string;

  @Column({ length: 256 })
  role: string;

  @Column({ length: 256 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 50 })
  treatment: string;

  @ManyToOne(() => CrmCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: CrmCompany;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
