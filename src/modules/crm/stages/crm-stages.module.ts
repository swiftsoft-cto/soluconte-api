import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmStage } from './entities/crm-stage.entity';
import { CrmStagesService } from './crm-stages.service';
import { CrmStagesController } from './crm-stages.controller';
import { CrmFunnel } from '../funnel/entities/crm-funnel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrmStage, CrmFunnel])],
  controllers: [CrmStagesController],
  providers: [CrmStagesService],
  exports: [CrmStagesService],
})
export class CrmStagesModule {}
