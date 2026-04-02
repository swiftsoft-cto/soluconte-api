import { Role } from 'src/modules/roles/entities/roles.entities';
import { Rule } from 'src/modules/rules/entities.rules.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('role_rule')
export class RoleRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.roleRules)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Rule, (rule) => rule.roleRules)
  @JoinColumn({ name: 'rule_id' })
  rule: Rule;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
