import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrmFunnelService } from './crm-funnel.service';
import { CreateCrmFunnelDto } from './dtos/create-crm-funnel.dto';
import { UpdateCrmFunnelDto } from './dtos/update-crm-funnel.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';

@ApiTags('CRM Funnel')
@Controller('api/crm/funnels')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class CrmFunnelController {
  constructor(private readonly crmFunnelService: CrmFunnelService) {}

  @Post()
  @Rule('crm-funnels.create')
  create(@Body() createCrmFunnelDto: CreateCrmFunnelDto) {
    return this.crmFunnelService.create(createCrmFunnelDto);
  }

  @Get()
  @Rule('crm-funnels.findAll')
  findAll() {
    return this.crmFunnelService.findAll();
  }

  @Get(':id')
  @Rule('crm-funnels.findOne')
  findOne(@Param('id') id: string) {
    return this.crmFunnelService.findOne(id);
  }

  @Patch(':id')
  @Rule('crm-funnels.update')
  update(
    @Param('id') id: string,
    @Body() updateCrmFunnelDto: UpdateCrmFunnelDto,
  ) {
    return this.crmFunnelService.update(id, updateCrmFunnelDto);
  }

  @Delete(':id')
  @Rule('crm-funnels.delete')
  remove(@Param('id') id: string) {
    return this.crmFunnelService.remove(id);
  }
}
