import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CrmTeam } from './crm-team.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('crm_team_users')
export class CrmTeamUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrmTeam, (team) => team.teamUsers)
  @JoinColumn({ name: 'team_id' })
  team: CrmTeam;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
