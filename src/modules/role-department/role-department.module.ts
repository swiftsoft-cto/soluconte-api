import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleDepartment } from './entities/role-department.entity';
import { RoleDepartmentService } from './role-department.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleDepartment])],
  providers: [RoleDepartmentService],
  exports: [RoleDepartmentService],
})
export class RoleDepartmentModule {}
