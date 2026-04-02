import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmDashboardController } from './crm-dashboard.controller';
import { CrmDashboardService } from './crm-dashboard.service';
import { CrmNegotiation } from '../negotiations/entities/crm-negotiation.entity';
import { CrmFunnel } from '../funnel/entities/crm-funnel.entity';
import { CrmFunnelAudit } from '../funnel/entities/crm-funnel-audit.entity';
import { CrmFunnelModule } from '../funnel/crm-funnel.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrmNegotiation, CrmFunnel, CrmFunnelAudit]),
    CrmFunnelModule,
  ],
  controllers: [CrmDashboardController],
  providers: [CrmDashboardService],
  exports: [CrmDashboardService],
})
export class CrmDashboardModule {}
