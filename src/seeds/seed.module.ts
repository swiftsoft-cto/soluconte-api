import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import CompaniesSeeder from './companies.seeder';
import DepartmentsSeeder from './departments.seeder';
import RoleDepartmentsSeeder from './role-department.seeder';
import RolesSeeder from './roles.seeder';
import RulesSeeder from './rules.seeder';
import RoleRulesSeeder from './role-rule.seeder';
import UsersSeeder from './users.seeder';
import UserRolesSeeder from './user-role.seeder';
import { InternalTasksSeeder } from './internal-tasks.seeder';
import CreateDepartmentRolesSeeder from './create-department-roles.seeder';
// import UpdateInternalTasksCreatedBySeeder from './update-internal-tasks-created-by.seeder';
import { TaskKanban } from '../modules/internal-tasks/entities/task-kanban.entity';
import { TaskColumn } from '../modules/internal-tasks/entities/task-column.entity';
import { InternalTask } from '../modules/internal-tasks/entities/internal-task.entity';
import { Department } from '../modules/departments/entities/departments.entiy';
import { User } from '../modules/users/entities/user.entity';
import { Company } from '../modules/companies/entities/companies.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskKanban,
      TaskColumn,
      InternalTask,
      Department,
      User,
      Company,
    ]),
  ],
  providers: [
    CompaniesSeeder,
    DepartmentsSeeder,
    RolesSeeder,
    RoleDepartmentsSeeder,
    RulesSeeder,
    RoleRulesSeeder,
    UsersSeeder,
    UserRolesSeeder,
    InternalTasksSeeder,
    CreateDepartmentRolesSeeder,
    // UpdateInternalTasksCreatedBySeeder,
  ],
  exports: [CompaniesSeeder],
})
export class SeedModule {}
