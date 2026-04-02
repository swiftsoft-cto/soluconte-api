import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export default class UsersSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const userRepository = this.dataSource.getRepository(User);

    const users = [
      {
        id: '1',
        name: 'Dayane',
        lastName: 'Borges Ribeiro',
        email: 'contato@soluconte.com.br',
        password: 'sol-1019LL',
        selectedCompany: { id: '1' },
      },
    ];

    for (const userData of users) {
      const exists = await userRepository.findOne({
        where: { email: userData.email },
      });
      if (!exists) {
        await userRepository.save(userRepository.create(userData));
        console.log(
          `User '${userData.email}' created and associated with company '${userData.selectedCompany.id}'.`,
        );
      } else {
        console.log(`User '${userData.email}' already exists.`);
      }
    }
  }
}
