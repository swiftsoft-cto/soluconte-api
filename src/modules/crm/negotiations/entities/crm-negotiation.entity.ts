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
import { CrmContact } from '../../contacts/entities/crm-contact.entity';
import { CrmFunnel } from '../../funnel/entities/crm-funnel.entity';
import { CrmStage } from '../../stages/entities/crm-stage.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('crm_negotiations')
export class CrmNegotiation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  mainInterest: string;

  @Column({ type: 'text', nullable: true })
  obs?: string;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column({ length: 100, nullable: true })
  origin?: string;

  @Column({ type: 'int', unique: false })
  order: number;

  @Column({ type: 'boolean', default: false })
  isLost: boolean;

  @Column({ type: 'boolean', default: false })
  isWon: boolean;

  @ManyToOne(() => CrmCompany, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: CrmCompany;

  @ManyToOne(() => CrmContact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: CrmContact;

  @ManyToOne(() => CrmFunnel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'funnel_id' })
  funnel: CrmFunnel;

  @ManyToOne(() => CrmStage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage: CrmStage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
