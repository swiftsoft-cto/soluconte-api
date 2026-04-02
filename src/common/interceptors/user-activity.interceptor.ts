import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class UserActivityInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Atualizar lastActivityAt se houver usuário autenticado
    if (user && user.id) {
      // Atualizar de forma assíncrona sem bloquear a requisição
      this.userRepository
        .update(user.id, {
          lastActivityAt: new Date(),
        })
        .catch((err) => {
          // Log do erro mas não interrompe a requisição
          console.error('Erro ao atualizar lastActivityAt:', err);
        });
    }

    return next.handle();
  }
}























