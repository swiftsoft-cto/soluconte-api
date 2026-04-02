import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CrmStagesService } from './crm-stages.service';

import { UpdateCrmStageDto } from './dtos/update-crm-stage.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';

@ApiTags('CRM Stages')
@Controller('api/crm/stages')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class CrmStagesController {
  constructor(private readonly crmStagesService: CrmStagesService) {}

  @Post()
  @Rule('crm-stages.create')
  create(@Body() createCrmStageDto: any) {
    return this.crmStagesService.create(createCrmStageDto);
  }

  @Get()
  @Rule('crm-stages.findAll')
  findAll() {
    return this.crmStagesService.findAll();
  }

  @Get('/filter')
  @Rule('crm-stages.filter')
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filtrar por nome do estágio',
  })
  @ApiQuery({
    name: 'funnelId',
    required: false,
    type: String,
    description: 'Filtrar por ID do funil',
  })
  filter(@Query('name') name?: string, @Query('funnelId') funnelId?: string) {
    return this.crmStagesService.filter(name, funnelId);
  }

  @Get(':id')
  @Rule('crm-stages.findOne')
  findOne(@Param('id') id: string) {
    return this.crmStagesService.findOne(id);
  }

  @Patch(':id')
  @Rule('crm-stages.update')
  update(
    @Param('id') id: string,
    @Body() updateCrmStageDto: UpdateCrmStageDto,
  ) {
    return this.crmStagesService.update(id, updateCrmStageDto);
  }

  @Delete(':id')
  @Rule('crm-stages.delete')
  remove(@Param('id') id: string) {
    return this.crmStagesService.remove(id);
  }
}
