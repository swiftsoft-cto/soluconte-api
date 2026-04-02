import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CrmTeam } from '../../team/entities/crm-team.entity';
import { CrmStage } from '../../stages/entities/crm-stage.entity';

@Entity('crm_funnels')
export class CrmFunnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 7 })
  color: string;

  @ManyToOne(() => CrmTeam)
  @JoinColumn({ name: 'team_id' })
  team: CrmTeam;

  @OneToMany(() => CrmStage, (stage) => stage.funnel)
  stages: CrmStage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
