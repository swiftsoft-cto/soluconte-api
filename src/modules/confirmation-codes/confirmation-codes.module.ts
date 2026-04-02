// confirmation-code.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfirmationCode } from './entities/confirmation-codes.entity';
import { ConfirmationCodeService } from './confirmation-code.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConfirmationCode]),
    forwardRef(() => EmailModule),
  ],
  providers: [ConfirmationCodeService],
  exports: [ConfirmationCodeService],
})
export class ConfirmationCodeModule {}
