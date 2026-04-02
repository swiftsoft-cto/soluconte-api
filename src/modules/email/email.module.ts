import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { EmailService } from './email.service';
import { forwardRef, Module } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => UsersModule), // Resolve a referência circular
  ],
  providers: [EmailService],
  exports: [EmailService], // Se precisar injetar EmailService em outro módulo
})
export class EmailModule {}
