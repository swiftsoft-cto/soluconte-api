import { RoleDepartment } from 'src/modules/role-department/entities/role-department.entity';
import { RoleHierarchy } from 'src/modules/role-hierarchy/entities/role-hierarchy.entity';
import { RoleRule } from 'src/modules/role-rule/entities/role-rule.entity';
import { UserRole } from 'src/modules/user-role/entities/user-role.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Roles Entity
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ length: 256, nullable: true })
  description: string;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[];

  @OneToMany(() => RoleHierarchy, (roleHierarchy) => roleHierarchy.parentRole)
  parentRoles: RoleHierarchy[];

  @OneToMany(() => RoleHierarchy, (roleHierarchy) => roleHierarchy.childRole)
  childRoles: RoleHierarchy[];

  @OneToMany(() => RoleDepartment, (roleDepartment) => roleDepartment.role)
  roleDepartments: RoleDepartment[];

  @OneToMany(() => RoleRule, (roleRule) => roleRule.role)
  roleRules: RoleRule[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
