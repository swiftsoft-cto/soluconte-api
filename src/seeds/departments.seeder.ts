import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Department } from 'src/modules/departments/entities/departments.entiy';

@Injectable()
export default class DepartmentsSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const departmentRepository = this.dataSource.getRepository(Department);

    const departmentsData = [
      {
        id: '1',
        name: 'Diretoria',
        description: `Executivo`,
        companyId: '1',
      },
    ];

    for (const departmentData of departmentsData) {
      const existingDepartment = await departmentRepository.findOne({
        where: {
          id: departmentData.id,
          name: departmentData.name,
          company: { id: departmentData.companyId },
        },
      });

      if (!existingDepartment) {
        const department = departmentRepository.create({
          id: departmentData.id,
          name: departmentData.name,
          description: departmentData.description,
          company: { id: departmentData.companyId },
        });
        await departmentRepository.save(department);
        console.log(`Department '${departmentData.name}' created.`);
      } else {
        console.log(`Department '${departmentData.name}' already exists.`);
      }
    }
  }
}
