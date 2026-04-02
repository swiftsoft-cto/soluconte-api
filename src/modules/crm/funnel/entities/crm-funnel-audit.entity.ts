import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('crm_funnel_audit')
export class CrmFunnelAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'funnel_id', nullable: true, type: 'varchar' })
  funnelId: string;

  @Column({ type: 'json', nullable: false })
  snapshot: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
