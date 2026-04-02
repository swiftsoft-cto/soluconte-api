import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CrmFunnel } from '../../funnel/entities/crm-funnel.entity';
import { CrmNegotiation } from '../../negotiations/entities/crm-negotiation.entity';

@Entity('crm_stages')
export class CrmStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  goal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversion: number;

  @Column({ length: 7 })
  color: string;

  @Column({ type: 'int', unique: false })
  order: number;

  @ManyToOne(() => CrmFunnel, (funnel) => funnel.stages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'funnel_id' })
  funnel: CrmFunnel;

  @OneToMany(() => CrmNegotiation, (negotiation) => negotiation.stage)
  negotiations: CrmNegotiation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
