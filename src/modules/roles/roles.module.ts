// src/modules/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/roles.entities';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RoleHierarchy } from 'src/modules/role-hierarchy/entities/role-hierarchy.entity';
import { RoleDepartment } from '../role-department/entities/role-department.entity';
import { Department } from '../departments/entities/departments.entiy';
import { RoleRuleModule } from '../role-rule/role-rule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, RoleHierarchy, RoleDepartment, Department]),
    RoleRuleModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
