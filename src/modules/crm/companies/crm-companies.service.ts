import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmCompany } from './entities/crm-company.entity';
import { CreateCrmCompanyDto } from './dtos/create-crm-company.dto';
import { UpdateCrmCompanyDto } from './dtos/update-crm-company.dto';

@Injectable()
export class CrmCompaniesService {
  constructor(
    @InjectRepository(CrmCompany)
    private readonly crmCompanyRepository: Repository<CrmCompany>,
  ) {}

  async create(createCrmCompanyDto: CreateCrmCompanyDto): Promise<CrmCompany> {
    const company = this.crmCompanyRepository.create(createCrmCompanyDto);
    return await this.crmCompanyRepository.save(company);
  }

  async findAll(
    page = 1,
    limit = 10,
    filter?: string,
  ): Promise<{
    data: CrmCompany[];
    meta: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const qb = this.crmCompanyRepository.createQueryBuilder('company');

    // Filtro de texto livre
    if (filter) {
      qb.andWhere(
        `
        company.nomeFantasia LIKE :f
        OR company.razaoSocial LIKE :f
        OR company.cnpj LIKE :f
      `,
        { f: `%${filter}%` },
      );
    }

    // Filtra apenas empresas com CNPJ
    qb.andWhere('company.cnpj IS NOT NULL AND company.cnpj != :empty', {
      empty: '',
    });

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

  async findOne(id: string): Promise<CrmCompany> {
    const company = await this.crmCompanyRepository.findOne({
      where: { id: id },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(
    id: string,
    updateCrmCompanyDto: UpdateCrmCompanyDto,
  ): Promise<CrmCompany> {
    const company = await this.findOne(id);
    Object.assign(company, updateCrmCompanyDto);
    return await this.crmCompanyRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const result = await this.crmCompanyRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
  }

  async findByCnpj(cnpj: string): Promise<CrmCompany | null> {
    return await this.crmCompanyRepository.findOne({ where: { cnpj } });
  }
}
