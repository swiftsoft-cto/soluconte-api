import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmTeamService } from './crm-team.service';
import { CrmTeamController } from './crm-team.controller';
import { CrmTeam } from './entities/crm-team.entity';
import { CrmTeamUser } from './entities/crm-team-user.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrmTeam, CrmTeamUser, User])],
  controllers: [CrmTeamController],
  providers: [CrmTeamService],
  exports: [CrmTeamService],
})
export class CrmTeamModule {}
