import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { RoleRuleService } from './role-rule.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { User } from 'src/common/decorators/user.decorator';
import { Rule } from 'src/common/decorators/rule.decorator';

@Controller('api/role-rule')
export class RoleRuleController {
  constructor(private readonly roleRuleService: RoleRuleService) {}

  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('role-rule.findAll')
  @Get()
  async getRoleRules(@User() currentUser: any) {
    const roles = await this.roleRuleService.getRoleRules(currentUser);
    return {
      message: 'Roles encontradas com sucesso',
      items: roles,
    };
  }

  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('role-rule.update')
  @Patch()
  async updateRoleRulesBulk(
    @Body() updateRolesDto: any,
    @User() currentUser: any,
  ) {
    // O serviço retorna { updated, warnings }
    const { updated, warnings } =
      await this.roleRuleService.updateRoleRulesBulk(
        updateRolesDto,
        currentUser,
      );
    // Define a mensagem de acordo com a existência de warnings
    let message = 'Permissões atualizadas com sucesso';
    if (warnings.length > 0) {
      message = `Permissões atualizadas com sucesso. \n
        Alterações nas permissões de seu próprio cargo são ignoradas.`;
    }

    return {
      message,
      items: {
        updated,
        warnings,
      },
    };
  }
}
