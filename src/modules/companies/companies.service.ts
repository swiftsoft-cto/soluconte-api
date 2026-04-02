import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/companies.entity';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { I18nService } from '../i18n/i18n.service';
import { CompaniesResponses } from './responses/companies.response';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly i18nService: I18nService,
  ) {}

  async paginate(
    limit: number,
    page: number,
    filter: string | undefined,
    isRootUsers: boolean,
    language: string,
    returnAll: boolean,
  ) {
    const query = this.companyRepository.createQueryBuilder('company');

    // Exclui empresas deletadas (soft delete) - aplicar ANTES dos joins
    query.where('company.deleted_at IS NULL');

    // Inclui o relacionamento com os usuários e suas roles
    query
      .leftJoinAndSelect('company.users', 'user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role');

    // Aplica filtro por nome da empresa, se fornecido
    if (filter) {
      query.andWhere('company.name LIKE :filter', { filter: `%${filter}%` });
    }

    // Verifica se o filtro é para usuários root
    if (isRootUsers) {
      // Retorna apenas empresas com usuários que têm isRootUser = true
      query.andWhere('user.isRootUser = :isRootUser', { isRootUser: true });
    }

    // Configura a paginação apenas se "returnAll" for falso
    if (!returnAll) {
      query.take(limit);
      query.skip((page - 1) * limit);
    }

    // Executa consulta
    const [items, totalItems] = await query.getManyAndCount();

    const totalPages = returnAll ? 1 : Math.ceil(totalItems / limit);

    // Retorna os dados com as informações das empresas, usuários e suas roles
    return {
      message: this.i18nService.translate(
        CompaniesResponses.RETRIEVED,
        language,
      ),
      statusCode: 200,
      data: {
        items: items.map((company: any) => ({
          id: company.id,
          businessName: company.businessName,
          cnpj: company.cnpj,
          imageUrl: company.imageUrl,
          users: company.users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            imageUrl: user.imageUrl,
            isRootUser: user.isRootUser,
            isEmailConfirmed: user.isEmailConfirmed,
            birthdate: user.birthdate,
            roles: user.userRoles.map((userRole) => ({
              id: userRole.role.id,
              name: userRole.role.name,
            })),
          })),
        })),
        totalItems,
        totalPages,
        currentPage: returnAll ? 1 : page,
      },
    };
  }

  /**
   * Busca ou cria uma nova empresa.
   */
  async findOrCreate(name: string): Promise<Company> {
    let company = await this.companyRepository.findOne({ where: { name } });
    if (!company) {
      company = this.companyRepository.create({ name });
      company = await this.companyRepository.save(company);
    }
    return company;
  }

  async findOne(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['departments'], // Carregar departamentos, se necessário
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return company;
  }

  async update(companyId: string, updateDto: UpdateCompanyDto) {
    const company = await this.findOne(companyId);

    Object.assign(company, updateDto);
    return this.companyRepository.save(company);
  }

  findAll() {
    // Usa query builder para garantir que soft delete seja respeitado
    return this.companyRepository
      .createQueryBuilder('company')
      .where('company.deleted_at IS NULL')
      .getMany();
  }
}
