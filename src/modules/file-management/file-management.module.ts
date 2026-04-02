import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileManagementService } from './file-management.service';
import { FileManagementController } from './file-management.controller';
import { DepartmentFilesService } from './department-files.service';
import { DepartmentFilesController } from './department-files.controller';
import { ClientFile } from './entities/client-file.entity';
import { ClientNotificationEmail } from './entities/client-notification-email.entity';
import { ClientNotificationWhatsApp } from './entities/client-notification-whatsapp.entity';
import { DepartmentFile } from './entities/department-file.entity';
import { DepartmentFolder } from './entities/department-folder.entity';
import { Company } from '../companies/entities/companies.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/departments.entiy';
import { StorageModule } from '../storage/storage.module';
import { EmailModule } from '../email/email.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientFile,
      ClientNotificationEmail,
      ClientNotificationWhatsApp,
      DepartmentFile,
      DepartmentFolder,
      Company,
      User,
      Department,
    ]),
    StorageModule,
    EmailModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [FileManagementController, DepartmentFilesController],
  providers: [FileManagementService, DepartmentFilesService],
  exports: [FileManagementService, DepartmentFilesService],
})
export class FileManagementModule {}




