import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import CompaniesSeeder from './seeds/companies.seeder';
import DepartmentsSeeder from './seeds/departments.seeder';
import RolesSeeder from './seeds/roles.seeder';
import RoleDepartmentsSeeder from './seeds/role-department.seeder';
import RulesSeeder from './seeds/rules.seeder';
import RoleRulesSeeder from './seeds/role-rule.seeder';
import UserRolesSeeder from './seeds/user-role.seeder';
import UsersSeeder from './seeds/users.seeder';
import { InternalTasksSeeder } from './seeds/internal-tasks.seeder';
import CreateDepartmentRolesSeeder from './seeds/create-department-roles.seeder';
// import UpdateInternalTasksCreatedBySeeder from './seeds/update-internal-tasks-created-by.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const companiesSeeder = app.get(CompaniesSeeder);
    await companiesSeeder.run();
    console.log('CompaniesSeeder executed.');

    const departmentsSeeder = new DepartmentsSeeder(dataSource);
    await departmentsSeeder.run();
    console.log('DepartmentsSeeder executed.');

    console.log('Seeding Roles...');
    const rolesSeeder = app.get(RolesSeeder);
    await rolesSeeder.run();

    console.log('Seeding RoleDepartments...');
    const roleDepartmentsSeeder = app.get(RoleDepartmentsSeeder);
    await roleDepartmentsSeeder.run();

    console.log('Seeding Rules...');
    const rulesSeeder = app.get(RulesSeeder);
    await rulesSeeder.run();

    console.log('Seeding RoleRules...');
    const roleRulesSeeder = app.get(RoleRulesSeeder);
    await roleRulesSeeder.run();

    console.log('Seeding Users...');
    const usersSeeder = app.get(UsersSeeder);
    await usersSeeder.run();

    console.log('Seeding UserRoles...');
    const userRolesSeeder = app.get(UserRolesSeeder);
    await userRolesSeeder.run();

    console.log('Seeding InternalTasks...');
    const internalTasksSeeder = app.get(InternalTasksSeeder);
    await internalTasksSeeder.seed();

    console.log('Creating Department Roles...');
    const createDepartmentRolesSeeder = app.get(CreateDepartmentRolesSeeder);
    await createDepartmentRolesSeeder.run();

    // console.log('Updating InternalTasks createdBy...');
    // const updateInternalTasksCreatedBySeeder = app.get(UpdateInternalTasksCreatedBySeeder);
    // await updateInternalTasksCreatedBySeeder.run();
  } catch (error) {
    console.error('Error executing seeders:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
