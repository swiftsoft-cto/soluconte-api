import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmContact } from './entities/crm-contact.entity';
import { CreateCrmContactDto } from './dtos/create-crm-contact.dto';
import { UpdateCrmContactDto } from './dtos/update-crm-contact.dto';

@Injectable()
export class CrmContactsService {
  constructor(
    @InjectRepository(CrmContact)
    private readonly crmContactRepository: Repository<CrmContact>,
  ) {}

  async create(createCrmContactDto: CreateCrmContactDto): Promise<CrmContact> {
    const contactData: any = { ...createCrmContactDto };

    if (createCrmContactDto.companyId) {
      contactData.company = { id: createCrmContactDto.companyId };
    }

    delete contactData.companyId;

    const contact = await this.crmContactRepository.save(contactData);
    return contact;
  }

  async findAll(
    page = 1,
    limit = 10,
    filter?: string,
  ): Promise<{
    data: CrmContact[];
    meta: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const qb = this.crmContactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company');

    if (filter) {
      qb.where(
        `(contact.name LIKE :filter
          OR contact.lastname LIKE :filter
          OR contact.email LIKE :filter
          OR contact.phone LIKE :filter)`,
        { filter: `%${filter}%` },
      );
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CrmContact> {
    const contact = await this.crmContactRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async update(
    id: string,
    updateCrmContactDto: UpdateCrmContactDto,
  ): Promise<CrmContact> {
    const contact = await this.findOne(id);

    const updateData: any = { ...updateCrmContactDto };

    if (updateCrmContactDto.companyId) {
      updateData.company = { id: updateCrmContactDto.companyId };
    }

    delete updateData.companyId;

    Object.assign(contact, updateData);
    return await this.crmContactRepository.save(contact);
  }

  async remove(id: string): Promise<void> {
    const result = await this.crmContactRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  async findByExactMatch(data: {
    name: string;
    email: string;
    phone: string;
    companyId: string;
  }): Promise<CrmContact | null> {
    return await this.crmContactRepository.findOne({
      where: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: { id: data.companyId },
      },
    });
  }
}
