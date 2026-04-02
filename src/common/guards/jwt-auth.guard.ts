import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // Se houver um erro e ele for um TokenExpiredError
    if (info && info.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token expirado. Faça login novamente.');
    }

    // Pode-se adicionar outras verificações aqui, se necessário

    // Se ocorrer algum outro erro ou usuário não for autenticado
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
