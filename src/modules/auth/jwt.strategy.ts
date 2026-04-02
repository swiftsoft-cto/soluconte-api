import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOneWithRelations(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Session expired');
    }

    if (!user.selectedCompany) {
      throw new UnauthorizedException('No company selected for the user');
    }

    const isAdministrator = user.userRoles.some((userRole) =>
      userRole.role.roleRules.some(
        (roleRule) => roleRule.rule.rule === 'administrator',
      ),
    );

    return {
      ...user,
      isMaster: isAdministrator,
    };
  }
}
