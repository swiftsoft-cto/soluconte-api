// src/modules/company-services/company-services.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyService as CompanyServiceEntity } from './entities/company-services.entity';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { Service } from 'src/modules/services/entities/services.entity';

@Injectable()
export class CompanyServicesService {
  constructor(
    @InjectRepository(CompanyServiceEntity)
    private readonly companyServicesRepo: Repository<CompanyServiceEntity>,

    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,

    @InjectRepository(Service)
    private readonly servicesRepo: Repository<Service>,
  ) {}

  /**
   * Cria um vínculo entre a empresa selecionada do usuário e um serviço.
   * - Recebe apenas serviceId no parâmetro, pois a company vem de currentUser.
   */
  async createRelation(serviceId: string, user: any) {
    const companyId = user.selectedCompany?.id;
    if (!companyId) {
      throw new NotFoundException(
        'Nenhuma empresa selecionada para este usuário.',
      );
    }

    // Verifica se a empresa existe
    const company = await this.companiesRepo.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Empresa não encontrada (ID: ${companyId}).`);
    }

    // Verifica se o serviço existe
    const service = await this.servicesRepo.findOne({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException(`Serviço não encontrado (ID: ${serviceId}).`);
    }

    // Cria e salva o relacionamento na tabela pivô
    const newRelation = this.companyServicesRepo.create({ company, service });
    return this.companyServicesRepo.save(newRelation);
  }

  /**
   * Lista os serviços vinculados à empresa do usuário, de forma PAGINADA.
   */
  async findRelationsPaginated(user: any, page = 1, limit = 10) {
    const companyId = user.selectedCompany?.id;
    if (!companyId) {
      throw new NotFoundException(
        'Nenhuma empresa selecionada para este usuário.',
      );
    }

    // Garante mínimo de 1
    page = Math.max(Number(page) || 1, 1);
    limit = Math.max(Number(limit) || 10, 1);

    // findAndCount retorna [lista, total]
    const [relations, total] = await this.companyServicesRepo.findAndCount({
      where: { company: { id: companyId } },
      relations: ['service'], // Carregamos apenas o 'service'
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' }, // opcional
    });

    // Queremos só o objeto "service" em cada relation
    const data = relations.map((rel) => rel.service);

    return {
      data, // array de serviços
      total, // total de relações encontradas
      page, // página atual
      last_page: Math.ceil(total / limit), // total de páginas
    };
  }

  /**
   * Remove (desrelaciona) um serviço específico usando serviceId,
   * pois a empresa vem de currentUser.selectedCompany.
   */
  async removeRelation(serviceId: string, user: any) {
    const companyId = user.selectedCompany?.id;
    if (!companyId) {
      throw new NotFoundException(
        'Nenhuma empresa selecionada para este usuário.',
      );
    }

    // Localiza o registro na pivô
    const relation = await this.companyServicesRepo.findOne({
      where: {
        company: { id: companyId },
        service: { id: serviceId },
      },
      relations: ['company', 'service'],
    });

    if (!relation) {
      throw new NotFoundException(
        `Relação não encontrada para companyId=${companyId} e serviceId=${serviceId}.`,
      );
    }

    await this.companyServicesRepo.remove(relation);
    return { message: 'Relacionamento removido com sucesso.' };
  }
}
