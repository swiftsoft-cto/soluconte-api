import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoleDepartment } from 'src/modules/role-department/entities/role-department.entity';

@Injectable()
export default class RoleDepartmentsSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const roleDepartmentRepository =
      this.dataSource.getRepository(RoleDepartment);

    const associations = [{ roleId: '1', departmentId: '1' }];

    for (const association of associations) {
      const existingRoleDept = await roleDepartmentRepository.findOne({
        where: {
          role: { id: association.roleId },
          department: { id: association.departmentId },
        },
      });

      if (!existingRoleDept) {
        const roleDept = roleDepartmentRepository.create({
          role: { id: association.roleId },
          department: { id: association.departmentId },
        });
        await roleDepartmentRepository.save(roleDept);
        console.log(
          `Role '${association.roleId}' associated with Department '${association.departmentId}'.`,
        );
      } else {
        console.log(
          `Role '${association.roleId}' is already associated with Department '${association.departmentId}'.`,
        );
      }
    }
  }
}
