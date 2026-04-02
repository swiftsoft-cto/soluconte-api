import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/services.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async findAllPaginated(page = 1, limit = 10) {
    page = page > 0 ? page : 1;
    limit = limit > 0 ? limit : 10;

    const [services, total] = await this.serviceRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    return {
      data: services,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  findOne(id: string) {
    return this.serviceRepository.findOne({ where: { id } });
  }

  async create(createDto: any) {
    const service = this.serviceRepository.create(createDto);
    return this.serviceRepository.save(service);
  }

  async update(id: string, updateDto: any) {
    // 1) Atualiza o registro
    await this.serviceRepository.update({ id }, updateDto);

    // 2) Retorna o registro atualizado (opcional, mas geralmente é útil)
    return this.serviceRepository.findOne({ where: { id } });
  }

  async remove(id: string) {
    return this.serviceRepository.delete(id);
  }
}
