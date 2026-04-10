import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfirmationCodeModule } from '../confirmation-codes/confirmation-codes.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EmailModule,
    ConfirmationCodeModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }), // Registra a estratégia 'jwt'
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '2h',
      },
    }),
  ],
  providers: [AuthService, JwtStrategy], // Adiciona LocalStrategy aos providers
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
