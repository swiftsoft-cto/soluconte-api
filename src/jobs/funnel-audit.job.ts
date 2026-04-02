import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { CrmFunnel } from 'src/modules/crm/funnel/entities/crm-funnel.entity';
import { CrmStage } from 'src/modules/crm/stages/entities/crm-stage.entity';
import { CrmFunnelAudit } from 'src/modules/crm/funnel/entities/crm-funnel-audit.entity';
import { CrmNegotiation } from 'src/modules/crm/negotiations/entities/crm-negotiation.entity';

@Injectable()
export class FunnelAuditJob {
  constructor(
    @InjectRepository(CrmFunnel)
    private readonly funnelRepository: Repository<CrmFunnel>,
    @InjectRepository(CrmStage)
    private readonly stageRepository: Repository<CrmStage>,
    @InjectRepository(CrmFunnelAudit)
    private readonly auditRepository: Repository<CrmFunnelAudit>,
    @InjectRepository(CrmNegotiation)
    private readonly negotiationRepository: Repository<CrmNegotiation>,
  ) {}
  onModuleInit() {
    console.log('FunnelAuditJob carregado ✔️');
  }

  @Cron('29 14 * * *') // todos os dias às 23:55
  async handleCron() {
    await this.run();
  }

  async run() {
    const funnels = await this.funnelRepository.find();
    for (const funnel of funnels) {
      const stages = await this.stageRepository.find({
        where: { funnel: { id: funnel.id } },
      });
      const stageIds = stages.map((s) => s.id);
      // Busca a contagem de negociações por estágio deste funil
      const negotiations = await this.negotiationRepository
        .createQueryBuilder('negotiation')
        .select(['negotiation.stage_id as stageId', 'COUNT(*) as count'])
        .where('negotiation.funnel_id = :funnelId', { funnelId: funnel.id })
        .andWhere('negotiation.stage_id IN (:...stageIds)', { stageIds })
        .groupBy('negotiation.stage_id')
        .getRawMany();
      const countMap = Object.fromEntries(
        negotiations.map((n) => [n.stageId, Number(n.count)]),
      );
      const snapshot = {
        id: funnel.id,
        name: funnel.name,
        color: funnel.color,
        stages: stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          goal: `${countMap[stage.id] || 0}/${stage.goal}`,
          color: stage.color,
          conversion: stage.conversion?.toString() ?? null,
        })),
      };
      const audit = this.auditRepository.create({
        funnelId: funnel.id,
        snapshot,
      });
      await this.auditRepository.save(audit);
    }
  }
}
