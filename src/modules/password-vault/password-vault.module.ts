import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordVault } from './entities/password-vault.entity';
import { PasswordEntry } from './entities/password-entry.entity';
import { PasswordAccessLog } from './entities/password-access-log.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/companies.entity';
import { PasswordVaultService } from './services/password-vault.service';
import { PasswordEntryService } from './services/password-entry.service';
import { EncryptionService } from './services/encryption.service';
import { PasswordVaultController } from './controllers/password-vault.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PasswordVault,
      PasswordEntry,
      PasswordAccessLog,
      User,
      Company,
    ]),
  ],
  controllers: [PasswordVaultController],
  providers: [
    PasswordVaultService,
    PasswordEntryService,
    EncryptionService,
  ],
  exports: [
    PasswordVaultService,
    PasswordEntryService,
    EncryptionService,
  ],
})
export class PasswordVaultModule {}
