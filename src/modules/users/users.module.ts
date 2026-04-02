import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { RolesModule } from '../roles/roles.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { RoleDepartmentModule } from '../role-department/role-department.module';
import { DepartmentsModule } from '../departments/departments.module';
import { CompaniesModule } from '../companies/companies.module';
import { Company } from '../companies/entities/companies.entity';
import { Department } from '../departments/entities/departments.entiy';
import { Role } from '../roles/entities/roles.entities';
import { RoleRule } from '../role-rule/entities/role-rule.entity';
import { Rule } from '../rules/entities.rules.entity';
import { EmailModule } from '../email/email.module';
import { ConfirmationCodeModule } from '../confirmation-codes/confirmation-codes.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Department, Role, RoleRule, Rule]),
    UserRoleModule,
    RolesModule,
    RoleDepartmentModule,
    DepartmentsModule,
    CompaniesModule,
    ConfirmationCodeModule,
    StorageModule,
    forwardRef(() => EmailModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
