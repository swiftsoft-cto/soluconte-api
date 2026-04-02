import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleDepartment } from './entities/role-department.entity';
import { Role } from '../roles/entities/roles.entities';
import { Department } from '../departments/entities/departments.entiy';

@Injectable()
export class RoleDepartmentService {
  constructor(
    @InjectRepository(RoleDepartment)
    private readonly roleDepartmentRepository: Repository<RoleDepartment>,
  ) {}

  async assignRoleToDepartment(
    role: Role,
    department: Department,
  ): Promise<RoleDepartment> {
    const roleDepartment = this.roleDepartmentRepository.create({
      role,
      department,
    });
    return this.roleDepartmentRepository.save(roleDepartment);
  }
}
