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
import { Department } from '../../departments/entities/departments.entiy';

@Entity('client_notification_whatsapp')
export class ClientNotificationWhatsApp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, name: 'phone_number' })
  phoneNumber: string;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  /** Departamento da Soluconte: null = Geral (recebe para qualquer departamento do cliente) */
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}



