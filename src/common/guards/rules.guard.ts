import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { RULE_KEY } from '../decorators/rule.decorator';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class RulesGuard implements CanActivate {
  private authService: AuthService;
  
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef, // Adicionado para resolver dependências dinamicamente
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Resolve o AuthService dinamicamente, se ainda não foi resolvido
    if (!this.authService) {
      this.authService = this.moduleRef.get(AuthService, { strict: false });
    }
    const requiredRules = this.reflector.get<string[]>(
      RULE_KEY,
      context.getHandler(),
    );
    if (!requiredRules || requiredRules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userPayload = await this.authService.getProfilePayload(user.id); // Chama o método getProfilePayload para obter os dados do usuário

    // Confere se o usuário tem a empresa principal (id === '1')
    const hasMainCompany = userPayload.companies.some(
      (company) => company.id === '1',
    );

    // Verifica se o usuário possui a regra 'administrator'
    const isAdministrator = user.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    );

    if (isAdministrator) {
      return true;
    }

    // Se o usuário tem a empresa principal usa ela como padrão, senão usa a empresa selecionada
    const selectedCompanyId = hasMainCompany ? '1' : user.selectedCompany?.id;
    if (!selectedCompanyId) {
      throw new ForbiddenException('No company selected for the current user');
    }

    // Verifica se o usuário possui as regras necessárias
    const hasAllRules = requiredRules.every((ruleName) =>
      user.userRoles?.some((userRole) => {
        const roleRules = userRole.role?.roleRules || [];
        const roleDepartments = userRole.role?.roleDepartments || [];

        return roleRules.some(
          (roleRule) =>
            roleRule.rule?.rule === ruleName &&
            roleDepartments.some(
              (roleDept) =>
                roleDept.department?.company?.id === selectedCompanyId,
            ),
        );
      }),
    );

    if (!hasAllRules) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
