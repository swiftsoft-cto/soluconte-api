import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleRule } from './entities/role-rule.entity';
import { RoleRuleService } from './role-rule.service';
import { RoleRuleController } from './role-rule.controller';
import { Role } from 'src/modules/roles/entities/roles.entities';
import { Rule } from 'src/modules/rules/entities.rules.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleRule, Role, Rule, User])],
  controllers: [RoleRuleController],
  providers: [RoleRuleService],
  exports: [RoleRuleService],
})
export class RoleRuleModule {}
