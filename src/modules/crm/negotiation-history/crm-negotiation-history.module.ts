import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmNegotiationHistoryService } from './crm-negotiation-history.service';
import { CrmNegotiationHistory } from './entities/crm-negotiation-history.entity';
import { CrmStagesModule } from '../stages/crm-stages.module';
import { CrmFunnelModule } from '../funnel/crm-funnel.module';
import { UsersModule } from 'src/modules/users/users.module';
import { CrmContactsModule } from '../contacts/crm-contacts.module';
import { CrmCompaniesModule } from '../companies/crm-companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrmNegotiationHistory]),
    CrmStagesModule,
    CrmFunnelModule,
    UsersModule,
    CrmContactsModule,
    CrmCompaniesModule,
  ],
  providers: [CrmNegotiationHistoryService],
  exports: [CrmNegotiationHistoryService],
})
export class CrmNegotiationHistoryModule {}
