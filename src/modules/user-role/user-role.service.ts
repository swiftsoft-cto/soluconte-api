import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/roles.entities';

@Injectable()
export class UserRoleService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async assignRoleToUser(user: User, role: Role): Promise<UserRole> {
    const userRole = this.userRoleRepository.create({ user, role });
    return this.userRoleRepository.save(userRole);
  }

  async findRolesByUser(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { user: { id: userId } },
      relations: ['role'],
    });
  }

  async removeUserRole(userRoleId: string): Promise<void> {
    await this.userRoleRepository.delete(userRoleId);
  }
}
