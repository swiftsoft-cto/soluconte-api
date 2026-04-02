import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmNegotiationsService } from './crm-negotiations.service';
import { CrmNegotiationsController } from './crm-negotiations.controller';
import { CrmNegotiation } from './entities/crm-negotiation.entity';
import { CrmCompaniesModule } from '../companies/crm-companies.module';
import { CrmContactsModule } from '../contacts/crm-contacts.module';
import { CrmFunnelModule } from '../funnel/crm-funnel.module';
import { CrmStagesModule } from '../stages/crm-stages.module';
import { UsersModule } from 'src/modules/users/users.module';
import { EmailModule } from 'src/modules/email/email.module';
import { HttpModule } from '@nestjs/axios';
import { CrmNegotiationHistoryModule } from '../negotiation-history/crm-negotiation-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrmNegotiation]),
    CrmCompaniesModule,
    CrmContactsModule,
    CrmFunnelModule,
    CrmStagesModule,
    UsersModule,
    EmailModule,
    HttpModule,
    CrmNegotiationHistoryModule,
  ],
  controllers: [CrmNegotiationsController],
  providers: [CrmNegotiationsService],
  exports: [CrmNegotiationsService],
})
export class CrmNegotiationsModule {}
