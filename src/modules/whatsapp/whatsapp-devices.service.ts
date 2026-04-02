import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from 'src/modules/agents/entities/agent.entity';
import { WhatsAppDevice } from './entities/whatsapp-device.entity';
import { WhatsAppThread } from './entities/whatsapp-thread.entity';
import { CreateWhatsAppDeviceDto } from './dto/create-whatsapp-device.dto';
import { PatchWhatsAppDeviceDto } from './dto/patch-whatsapp-device.dto';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class WhatsAppDevicesService {
  constructor(
    @InjectRepository(WhatsAppDevice)
    private readonly deviceRepo: Repository<WhatsAppDevice>,
    @InjectRepository(WhatsAppThread)
    private readonly threadRepo: Repository<WhatsAppThread>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async list(): Promise<WhatsAppDevice[]> {
    return this.deviceRepo.find({
      order: { isDefault: 'DESC', createdAt: 'ASC' },
      relations: ['agent'],
    });
  }

  async create(dto: CreateWhatsAppDeviceDto): Promise<WhatsAppDevice> {
    const device = this.deviceRepo.create({
      name: dto.name.trim(),
      phoneLabel: dto.phoneLabel?.trim() ?? null,
      operatorLabel: dto.operatorLabel?.trim() ?? null,
      isDefault: false,
    });
    return this.deviceRepo.save(device);
  }

  async patch(
    id: string,
    dto: PatchWhatsAppDeviceDto,
    loggedUserId: string,
  ): Promise<WhatsAppDevice> {
    const device = await this.deviceRepo.findOne({
      where: { id },
      relations: ['agent'],
    });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    if (dto.name !== undefined) device.name = dto.name.trim();
    if (dto.phoneLabel !== undefined) {
      device.phoneLabel = dto.phoneLabel === null || dto.phoneLabel === '' ? null : dto.phoneLabel.trim();
    }
    if (dto.operatorLabel !== undefined) {
      device.operatorLabel =
        dto.operatorLabel === null || dto.operatorLabel === ''
          ? null
          : dto.operatorLabel.trim();
    }

    if (dto.agentId !== undefined) {
      if (dto.agentId === null) {
        device.agent = null;
        device.aiActingUserId = null;
      } else {
        const agent = await this.agentRepo.findOne({ where: { id: dto.agentId } });
        if (!agent) throw new BadRequestException('Agente não encontrado');
        device.agent = agent;
        device.aiActingUserId = loggedUserId;
      }
    }

    const agentTouched = dto.agentId !== undefined;
    const saved = await this.deviceRepo.save(device);

    if (agentTouched) {
      const linkedAgentId = saved.agent?.id ?? null;
      const actingId = linkedAgentId ? loggedUserId : null;
      await this.threadRepo.update(
        { deviceId: saved.id },
        {
          agentId: linkedAgentId,
          aiEnabled: !!linkedAgentId,
          aiActingUserId: actingId,
        },
      );
    }

    return this.deviceRepo.findOne({
      where: { id: saved.id },
      relations: ['agent'],
    }) as Promise<WhatsAppDevice>;
  }

  async remove(id: string): Promise<void> {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    if (device.isDefault) {
      throw new BadRequestException(
        'Não é possível excluir o dispositivo padrão da sessão WhatsApp.',
      );
    }
    await this.whatsAppService.disconnectDeviceIfExists(id);
    await this.deviceRepo.remove(device);
  }
}
