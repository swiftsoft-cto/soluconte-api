import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from 'src/modules/user-role/entities/user-role.entity';

@Injectable()
export default class UserRolesSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const userRoleRepository = this.dataSource.getRepository(UserRole);

    const associations = [{ userId: '1', roleId: '1' }];

    for (const association of associations) {
      const existingUserRole = await userRoleRepository.findOne({
        where: {
          user: { id: association.userId },
          role: { id: association.roleId },
        },
      });

      if (!existingUserRole) {
        const userRole = userRoleRepository.create({
          user: { id: association.userId },
          role: { id: association.roleId },
        });
        await userRoleRepository.save(userRole);
        console.log(
          `Role '${association.roleId}' assigned to User '${association.userId}'.`,
        );
      } else {
        console.log(
          `User '${association.userId}' already has Role '${association.roleId}'.`,
        );
      }
    }
  }
}
