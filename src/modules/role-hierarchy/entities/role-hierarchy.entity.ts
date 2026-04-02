import { Role } from 'src/modules/roles/entities/roles.entities';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// RoleHierarchy Entity
@Entity('role_hierarchy')
export class RoleHierarchy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.parentRoles)
  @JoinColumn({ name: 'parent_role_id' })
  parentRole: Role;

  @ManyToOne(() => Role, (role) => role.childRoles)
  @JoinColumn({ name: 'child_role_id' })
  childRole: Role;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
