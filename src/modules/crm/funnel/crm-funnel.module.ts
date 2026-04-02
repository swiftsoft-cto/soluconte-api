import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmFunnel } from './entities/crm-funnel.entity';
import { CrmFunnelService } from './crm-funnel.service';
import { CrmFunnelController } from './crm-funnel.controller';
import { CrmTeam } from '../team/entities/crm-team.entity';
import { CrmStage } from '../stages/entities/crm-stage.entity';
import { FunnelAuditJob } from 'src/jobs/funnel-audit.job';
import { CrmFunnelAudit } from './entities/crm-funnel-audit.entity';
import { CrmNegotiation } from '../negotiations/entities/crm-negotiation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrmFunnel,
      CrmTeam,
      CrmStage,
      CrmFunnelAudit,
      CrmNegotiation,
    ]),
  ],
  controllers: [CrmFunnelController],
  providers: [CrmFunnelService, FunnelAuditJob],
  exports: [CrmFunnelService, FunnelAuditJob],
})
export class CrmFunnelModule {}
