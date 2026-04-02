import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmContactsService } from './crm-contacts.service';
import { CrmContactsController } from './crm-contacts.controller';
import { CrmContact } from './entities/crm-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrmContact])],
  controllers: [CrmContactsController],
  providers: [CrmContactsService],
  exports: [CrmContactsService],
})
export class CrmContactsModule {}
