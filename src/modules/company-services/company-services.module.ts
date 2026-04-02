import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyServicesService } from './company-services.service';
import { CompanyServicesController } from './company-services.controller';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { Service } from 'src/modules/services/entities/services.entity';
import { CompanyService } from './entities/company-services.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyService, Company, Service])],
  controllers: [CompanyServicesController],
  providers: [CompanyServicesService],
  exports: [CompanyServicesService],
})
export class CompanyServicesModule {}
