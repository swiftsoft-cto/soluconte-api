import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmStage } from './entities/crm-stage.entity';
import { CreateCrmStageDto } from './dtos/create-crm-stage.dto';
import { UpdateCrmStageDto } from './dtos/update-crm-stage.dto';

@Injectable()
export class CrmStagesService {
  constructor(
    @InjectRepository(CrmStage)
    private readonly crmStageRepository: Repository<CrmStage>,
  ) {}

  async create(createCrmStageDto: CreateCrmStageDto): Promise<CrmStage> {
    console.log(
      '🚀 ~ CrmStagesService ~ create ~ createCrmStageDto:',
      createCrmStageDto,
    );
    const stageData: any = { ...createCrmStageDto };

    // Converte funnelId para funnel
    if (stageData.funnelId) {
      stageData.funnel = { id: stageData.funnelId };
      delete stageData.funnelId;
    }

    console.log('🚀 ~ CrmStagesService ~ create ~ stageData:', stageData);
    const stage = await this.crmStageRepository.save(stageData);
    return this.findOne(stage.id);
  }

  async findAll(): Promise<CrmStage[]> {
    return this.crmStageRepository.find({
      relations: ['funnel'],
    });
  }

  async filter(name?: string, funnelId?: string): Promise<CrmStage[]> {
    const query = this.crmStageRepository
      .createQueryBuilder('stage')
      .leftJoinAndSelect('stage.funnel', 'funnel');

    if (name) {
      query.andWhere('stage.name LIKE :name', { name: `%${name}%` });
    }

    if (funnelId) {
      query.andWhere('funnel.id = :funnelId', { funnelId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<CrmStage> {
    const stage = await this.crmStageRepository.findOne({
      where: { id },
      relations: ['funnel'],
    });
    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }
    return stage;
  }

  async update(
    id: string,
    updateCrmStageDto: UpdateCrmStageDto,
  ): Promise<CrmStage> {
    const stage = await this.findOne(id);

    const updateData: any = { ...updateCrmStageDto };
    if (updateCrmStageDto.funnelId) {
      updateData.funnelId = { id: updateCrmStageDto.funnelId };
      delete updateData.funnelId;
    }

    Object.assign(stage, updateData);
    return await this.crmStageRepository.save(stage);
  }

  async remove(id: string): Promise<void> {
    const result = await this.crmStageRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }
  }

  async findDefault(funnelId: string): Promise<CrmStage> {
    const stage = await this.crmStageRepository.findOne({
      where: { funnel: { id: funnelId }, isDefault: true },
    });
    if (!stage) {
      throw new NotFoundException(
        'Nenhum estágio padrão encontrado para este funil',
      );
    }
    return stage;
  }
}
