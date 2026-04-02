import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CrmNegotiationsService } from './crm-negotiations.service';
import { CreateCrmNegotiationDto } from './dtos/create-crm-negotiation.dto';
import { UpdateCrmNegotiationDto } from './dtos/update-crm-negotiation.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';
import { CreateLeadDto } from './dtos/create-lead.dto';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('CRM Negotiations')
@Controller('api/crm/negotiations')
@ApiBearerAuth()
export class CrmNegotiationsController {
  constructor(
    private readonly crmNegotiationsService: CrmNegotiationsService,
  ) {}

  @Post('lead')
  @ApiOperation({ summary: 'Cria uma nova negociação a partir de um lead' })
  @ApiResponse({ status: 201, description: 'Lead registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createLead(@Body() createLeadDto: CreateLeadDto) {
    return this.crmNegotiationsService.createLead(createLeadDto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.create')
  @ApiOperation({ summary: 'Cria uma nova negociação' })
  @ApiResponse({ status: 201, description: 'Negociação criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() createCrmNegotiationDto: CreateCrmNegotiationDto) {
    return this.crmNegotiationsService.create(createCrmNegotiationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.paginate')
  @ApiOperation({ summary: 'Lista negociações com paginação e filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    description: 'Texto livre',
  })
  @ApiQuery({
    name: 'funnelId',
    required: false,
    type: String,
    description: 'UUID do funil',
  })
  @ApiQuery({
    name: 'stageId',
    required: false,
    type: String,
    description: 'UUID da etapa',
  })
  @ApiQuery({
    name: 'ownerId',
    required: false,
    type: String,
    description: 'UUID do owner',
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'UUID da empresa',
  })
  @ApiQuery({
    name: 'contactId',
    required: false,
    type: String,
    description: 'UUID do contato',
  })
  @ApiQuery({
    name: 'origin',
    required: false,
    type: String,
    description: 'Origem exata ou parcial',
  })
  @ApiQuery({
    name: 'isLost',
    required: false,
    type: Boolean,
    description: 'Filtrar por negociações perdidas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de negociações retornada com sucesso',
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filter') filter?: string,
    @Query('funnelId') funnelId?: string,
    @Query('stageId') stageId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('companyId') companyId?: string,
    @Query('contactId') contactId?: string,
    @Query('origin') origin?: string,
    @Query('isLost') isLost?: boolean,
  ) {
    return this.crmNegotiationsService.findAll(
      page,
      limit,
      filter,
      funnelId,
      stageId,
      ownerId,
      companyId,
      contactId,
      origin,
      isLost,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.findOne')
  @ApiOperation({ summary: 'Busca uma negociação pelo ID' })
  @ApiResponse({
    status: 200,
    description: 'Negociação encontrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Negociação não encontrada' })
  findOne(@Param('id') id: string) {
    return this.crmNegotiationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.update')
  @ApiOperation({ summary: 'Atualiza uma negociação' })
  @ApiResponse({
    status: 200,
    description: 'Negociação atualizada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Negociação não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateCrmNegotiationDto: UpdateCrmNegotiationDto,
    @User() user: any,
  ) {
    return this.crmNegotiationsService.update(
      id,
      updateCrmNegotiationDto,
      user,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.delete')
  @ApiOperation({ summary: 'Remove uma negociação' })
  @ApiResponse({ status: 200, description: 'Negociação removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Negociação não encontrada' })
  remove(@Param('id') id: string) {
    return this.crmNegotiationsService.remove(id);
  }

  @Get(':id/details')
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.findOne-details')
  @ApiOperation({ summary: 'Busca detalhes completos de uma negociação' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da negociação encontrados',
  })
  @ApiResponse({ status: 404, description: 'Negociação não encontrada' })
  findOneWithDetails(@Param('id') id: string) {
    return this.crmNegotiationsService.findOneWithDetails(id);
  }

  @Get(':id/duplicates')
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.check-duplicates')
  @ApiOperation({
    summary:
      'Verifica possíveis negociações duplicadas a partir de uma negociação existente',
  })
  @ApiResponse({ status: 200, description: 'Lista de possíveis duplicatas' })
  @ApiResponse({ status: 404, description: 'Negociação não encontrada' })
  checkDuplicates(@Param('id') id: string) {
    return this.crmNegotiationsService.findDuplicates(id);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('crm-negotiations.get-history')
  @ApiOperation({
    summary: 'Busca o histórico de alterações de uma negociação',
  })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Negociação não encontrada' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página',
  })
  getHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmNegotiationsService.getHistory(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }
}
