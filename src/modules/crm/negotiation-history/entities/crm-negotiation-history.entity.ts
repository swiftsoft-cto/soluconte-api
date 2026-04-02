import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CrmNegotiation } from '../../negotiations/entities/crm-negotiation.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('crm_negotiation_history')
export class CrmNegotiationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrmNegotiation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'negotiation_id' })
  negotiation: CrmNegotiation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  action: string;

  @Column({ type: 'json', nullable: true })
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    oldName?: string;
    newName?: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;
}
