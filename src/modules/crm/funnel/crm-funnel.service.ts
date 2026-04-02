import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmFunnel } from './entities/crm-funnel.entity';
import { CreateCrmFunnelDto } from './dtos/create-crm-funnel.dto';
import { UpdateCrmFunnelDto } from './dtos/update-crm-funnel.dto';
import { CrmFunnelAudit } from './entities/crm-funnel-audit.entity';

@Injectable()
export class CrmFunnelService {
  constructor(
    @InjectRepository(CrmFunnel)
    private readonly crmFunnelRepository: Repository<CrmFunnel>,
    @InjectRepository(CrmFunnelAudit)
    private readonly auditRepository: Repository<CrmFunnelAudit>,
  ) {}

  async create(createCrmFunnelDto: CreateCrmFunnelDto): Promise<CrmFunnel> {
    const funnelData: any = { ...createCrmFunnelDto };
    funnelData.team = { id: createCrmFunnelDto.teamId };
    delete funnelData.teamId;

    const funnel = await this.crmFunnelRepository.save(funnelData);
    return this.findOne(funnel.id);
  }

  async findAll(): Promise<CrmFunnel[]> {
    return this.crmFunnelRepository.find({
      relations: ['team', 'stages', 'stages.negotiations'],
    });
  }

  async findOne(id: string): Promise<CrmFunnel> {
    const funnel = await this.crmFunnelRepository.findOne({
      where: { id },
      relations: [
        'team',
        'stages',
        'stages.negotiations',
        'stages.negotiations.company',
        'stages.negotiations.contact',
        'stages.negotiations.owner',
      ],
    });
    if (!funnel) {
      throw new NotFoundException(`Funnel with ID ${id} not found`);
    }
    return funnel;
  }

  async update(
    id: string,
    updateCrmFunnelDto: UpdateCrmFunnelDto,
  ): Promise<CrmFunnel> {
    const funnel = await this.findOne(id);

    const updateData: any = { ...updateCrmFunnelDto };
    if (updateCrmFunnelDto.teamId) {
      updateData.team = { id: updateCrmFunnelDto.teamId };
      delete updateData.teamId;
    }

    Object.assign(funnel, updateData);
    return await this.crmFunnelRepository.save(funnel);
  }

  async remove(id: string): Promise<void> {
    const result = await this.crmFunnelRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Funnel with ID ${id} not found`);
    }
  }

  /**
   * Retorna snapshots de auditoria de funil por range de data (agrupado por dia)
   */
  async getFunnelGoalsHistory(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    // Busca todos os snapshots no range
    const audits = await this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.createdAt >= :start', { start })
      .andWhere('audit.createdAt <= :end', { end })
      .orderBy('audit.createdAt', 'ASC')
      .getMany();
    // Agrupa por dia (YYYY-MM-DD)
    const grouped: Record<string, any[]> = {};
    for (const audit of audits) {
      const day = audit.createdAt.toISOString().slice(0, 10);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(audit.snapshot);
    }
    return grouped;
  }
}
