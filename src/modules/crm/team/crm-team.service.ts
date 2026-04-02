import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmTeam } from './entities/crm-team.entity';
import { CrmTeamUser } from './entities/crm-team-user.entity';
import { CreateCrmTeamDto } from './dtos/create-crm-team.dto';
import { UpdateCrmTeamDto } from './dtos/update-crm-team.dto';
import { UpdateTeamUsersDto } from './dtos/update-team-users.dto';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class CrmTeamService {
  constructor(
    @InjectRepository(CrmTeam)
    private readonly crmTeamRepository: Repository<CrmTeam>,
    @InjectRepository(CrmTeamUser)
    private readonly crmTeamUserRepository: Repository<CrmTeamUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createCrmTeamDto: CreateCrmTeamDto): Promise<CrmTeam> {
    const team = await this.crmTeamRepository.save(createCrmTeamDto);
    return team;
  }

  async findAll(
    page = 1,
    limit = 10,
    filter?: string,
  ): Promise<{
    data: CrmTeam[];
    meta: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const qb = this.crmTeamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.teamUsers', 'teamUsers')
      .leftJoinAndSelect('teamUsers.user', 'user');

    if (filter) {
      qb.where('team.name LIKE :filter', { filter: `%${filter}%` });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CrmTeam> {
    const team = await this.crmTeamRepository.findOne({
      where: { id },
      relations: ['teamUsers', 'teamUsers.user'],
    });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return team;
  }

  async update(
    id: string,
    updateCrmTeamDto: UpdateCrmTeamDto,
  ): Promise<CrmTeam> {
    const team = await this.findOne(id);
    Object.assign(team, updateCrmTeamDto);
    return await this.crmTeamRepository.save(team);
  }

  async remove(id: string): Promise<void> {
    const result = await this.crmTeamRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
  }

  async updateTeamUsers(
    id: string,
    updateTeamUsersDto: UpdateTeamUsersDto,
  ): Promise<CrmTeam> {
    // Remove existing team users
    await this.crmTeamUserRepository.delete({ team: { id } });

    // Add new team users
    const teamUsers = updateTeamUsersDto.userIds.map((userId) => ({
      team: { id },
      user: { id: userId },
    }));

    await this.crmTeamUserRepository.save(teamUsers);

    return this.findOne(id);
  }
}
