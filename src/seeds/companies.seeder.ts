import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { InternalTasksSeeder } from './internal-tasks.seeder';

@Injectable()
export default class CompaniesSeeder {
  constructor(
    private readonly dataSource: DataSource,
    private readonly internalTasksSeeder: InternalTasksSeeder,
  ) {}

  public async run() {
    const companyRepository = this.dataSource.getRepository(Company);

    const companiesData = [
      {
        id: '1',
        name: 'SOLUCONTE CONTABILIDADE E CONSULTORIA LTDA',
        cnpj: '37.110.651/0001-44',
        businessName: 'SOLUCONTE CONTABILIDADE E CONSULTORIA LTDA',
        tradeName: 'Soluconte',
        status: 'ATIVA',
        companyType: 'MATRIZ',
        size: 'MICRO EMPRESA',
        legalNature: '206-2 - Sociedade Empresária Limitada',
        capital: 10000.0,
        mainActivity: 'Atividades de contabilidade',
        secondaryActivities: [
          'Comércio varejista de livros',
          'Atividades de consultoria e auditoria contábil e tributária',
          'Treinamento em desenvolvimento profissional e gerencial',
        ],
        email: 'contato@soluconte.com.br',
        phone: '(41) 9707-9121 / (41) 9875-0869',
        address: 'RUA JOAO DE BRITO',
        neighborhood: 'CRUZEIRO',
        city: 'SAO JOSE DOS PINHAIS',
        state: 'PR',
        zipCode: '83010090',
        simpleOption: true,
        simeiOption: false,
      },
    ];

    for (const companyData of companiesData) {
      const existingCompany = await companyRepository.findOne({
        where: { cnpj: companyData.cnpj },
      });

      if (!existingCompany) {
        const company = companyRepository.create(companyData);
        await companyRepository.save(company);
        console.log(`Company '${companyData.name}' created.`);
      } else {
        console.log(`Company '${companyData.name}' already exists.`);
      }
    }

    // Executar seeder de tarefas internas após criar as empresas
    await this.internalTasksSeeder.seed();
  }
}
