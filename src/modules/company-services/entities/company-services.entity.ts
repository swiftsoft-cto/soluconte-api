import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Service } from '../../services/entities/services.entity';
import { Company } from 'src/modules/companies/entities/companies.entity';

@Entity('company_services')
export class CompanyService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relação com Service
  @ManyToOne(() => Service, (service) => service.companyServices, {
    nullable: false,
  })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  // Relação com Company
  @ManyToOne(() => Company, (company) => company.companyServices, {
    nullable: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
