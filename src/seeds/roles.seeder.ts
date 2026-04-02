import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from 'src/modules/roles/entities/roles.entities';

@Injectable()
export default class RolesSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const roleRepository = this.dataSource.getRepository(Role);

    const rolesData = [{ id: '1', name: 'CEO', description: 'Administrador' }];

    for (const roleData of rolesData) {
      const existingRole = await roleRepository.findOne({
        where: { id: roleData.id, name: roleData.name },
      });

      if (!existingRole) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`Role '${roleData.name}' created.`);
      } else {
        console.log(`Role '${roleData.name}' already exists.`);
      }
    }
  }
}
