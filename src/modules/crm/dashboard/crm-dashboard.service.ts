import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmNegotiation } from '../negotiations/entities/crm-negotiation.entity';

@Injectable()
export class CrmDashboardService {
  constructor(
    @InjectRepository(CrmNegotiation)
    private readonly negotiationRepository: Repository<CrmNegotiation>,
  ) {}

  async getOverview(startDate?: string, endDate?: string, funnelId?: string) {
    const dateFilter = this.getDateFilter(startDate, endDate);

    // Total de negociações
    const totalNegotiationsQuery =
      this.negotiationRepository.createQueryBuilder('negotiation');

    if (dateFilter) {
      totalNegotiationsQuery.where(dateFilter.condition, dateFilter.params);
    }

    // Aplicar filtro de funil se fornecido
    if (funnelId) {
      totalNegotiationsQuery.andWhere('negotiation.funnelId = :funnelId', { funnelId });
    }

    const totalNegotiations = await totalNegotiationsQuery.getCount();

    // Negociações abertas (não perdidas)
    const openNegotiationsQuery = this.negotiationRepository
      .createQueryBuilder('negotiation')
      .where('negotiation.isLost = :isLost', { isLost: false });

    if (dateFilter) {
      openNegotiationsQuery.andWhere(dateFilter.condition, dateFilter.params);
    }

    // Aplicar filtro de funil se fornecido
    if (funnelId) {
      openNegotiationsQuery.andWhere('negotiation.funnelId = :funnelId', { funnelId });
    }

    const openNegotiations = await openNegotiationsQuery.getCount();

    // Negociações ganhas (stage.conversion = 100)
    const wonNegotiationsQuery = this.negotiationRepository
      .createQueryBuilder('negotiation')
      .innerJoin('negotiation.stage', 'stage')
      .where('negotiation.isLost = :isLost', { isLost: false })
      .andWhere('stage.conversion = 100');

    if (dateFilter) {
      wonNegotiationsQuery.andWhere(dateFilter.condition, dateFilter.params);
    }

    // Aplicar filtro de funil se fornecido
    if (funnelId) {
      wonNegotiationsQuery.andWhere('negotiation.funnelId = :funnelId', { funnelId });
    }

    const wonNegotiations = await wonNegotiationsQuery.getCount();

    // Negociações perdidas
    const lostNegotiationsQuery = this.negotiationRepository
      .createQueryBuilder('negotiation')
      .where('negotiation.isLost = :isLost', { isLost: true });

    if (dateFilter) {
      lostNegotiationsQuery.andWhere(dateFilter.condition, dateFilter.params);
    }

    // Aplicar filtro de funil se fornecido
    if (funnelId) {
      lostNegotiationsQuery.andWhere('negotiation.funnelId = :funnelId', { funnelId });
    }

    const lostNegotiations = await lostNegotiationsQuery.getCount();

    // Suspeitas de duplicatas (mainInterest, email e phone do contato, mesma empresa, últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const duplicatesQuery = await this.negotiationRepository
      .createQueryBuilder('negotiation')
      .select('COUNT(DISTINCT n1.id)', 'count')
      .innerJoin(
        CrmNegotiation,
        'n1',
        'n1.mainInterest = negotiation.mainInterest AND n1.id != negotiation.id',
      )
      .innerJoin('negotiation.contact', 'contact')
      .innerJoin('n1.contact', 'contact1')
      .innerJoin('negotiation.company', 'company')
      .innerJoin('n1.company', 'company1')
      .where('contact.email = contact1.email')
      .andWhere('contact.phone = contact1.phone')
      .andWhere('company.id = company1.id')
      .andWhere('n1.created_at >= :thirtyDaysAgo', { thirtyDaysAgo });

    if (dateFilter) {
      duplicatesQuery.andWhere(dateFilter.condition, dateFilter.params);
    }

    // Aplicar filtro de funil se fornecido
    if (funnelId) {
      duplicatesQuery.andWhere('negotiation.funnelId = :funnelId', { funnelId });
      duplicatesQuery.andWhere('n1.funnelId = :funnelId', { funnelId });
    }

    const duplicatesSuspected = Number(
      (await duplicatesQuery.getRawOne()).count,
    );

    // Média de dias do ciclo (da criação até ganhar/perder)
    const cycleQuery = this.negotiationRepository
      .createQueryBuilder('negotiation')
      .select(
        'AVG(TIMESTAMPDIFF(DAY, negotiation.created_at, negotiation.updated_at))',
        'avgDays',
      )
      .leftJoin('negotiation.stage', 'stage')
      .where(
        'negotiation.isLost = true OR (negotiation.isLost = false AND stage.conversion = 100)',
      );

    if (dateFilter) {
      cycleQuery.andWhere(dateFilter.condition, dateFilter.params);
    }

    // Aplicar filtro de funil se fornecido
    if (funnelId) {
      cycleQuery.andWhere('negotiation.funnelId = :funnelId', { funnelId });
    }

    const cycleResult = await cycleQuery.getRawOne();
    const avgCycleDays =
      cycleResult && cycleResult.avgDays
        ? Number(cycleResult.avgDays).toFixed(1)
        : '0.0';

    return {
      overview: {
        totalNegotiations,
        openNegotiations,
        wonNegotiations,
        lostNegotiations,
        duplicatesSuspected,
        avgCycleDays,
        dateRange: dateFilter
          ? {
              startDate,
              endDate,
            }
          : null,
      },
    };
  }

  private getDateFilter(startDate?: string, endDate?: string) {
    // Se não vier nenhum filtro, usar o mês atual
    if (!startDate && !endDate) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return {
        condition:
          'negotiation.created_at >= :startDate AND negotiation.created_at <= :endDate',
        params: {
          startDate: firstDay,
          endDate: lastDay,
        },
      };
    }

    let condition = '';
    const params: any = {};

    if (startDate) {
      condition += 'negotiation.created_at >= :startDate';
      params.startDate = new Date(startDate);
    }

    if (endDate) {
      if (condition) {
        condition += ' AND ';
      }
      condition += 'negotiation.created_at <= :endDate';
      params.endDate = new Date(`${endDate}T23:59:59.999Z`);
    }

    return { condition, params };
  }
}
