import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmCompaniesService } from './crm-companies.service';
import { CrmCompaniesController } from './crm-companies.controller';
import { CrmCompany } from './entities/crm-company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrmCompany])],
  controllers: [CrmCompaniesController],
  providers: [CrmCompaniesService],
  exports: [CrmCompaniesService],
})
export class CrmCompaniesModule {}
