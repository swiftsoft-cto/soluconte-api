import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CrmDashboardService } from './crm-dashboard.service';
import { CrmFunnelService } from '../funnel/crm-funnel.service';

@ApiTags('CRM Dashboard')
@Controller('api/crm/dashboard')
@ApiBearerAuth()
export class CrmDashboardController {
  constructor(
    private readonly crmDashboardService: CrmDashboardService,
    private readonly crmFunnelService: CrmFunnelService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Obter visão geral do CRM' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Data inicial (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'funnelId',
    required: false,
    type: String,
    description: 'ID do funil para filtrar (opcional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna dados gerais do CRM',
    schema: {
      type: 'object',
      properties: {
        overview: {
          type: 'object',
          properties: {
            totalNegotiations: { type: 'number', example: 327 },
            openNegotiations: { type: 'number', example: 241 },
            wonNegotiations: { type: 'number', example: 46 },
            lostNegotiations: { type: 'number', example: 40 },
            duplicatesSuspected: { type: 'number', example: 3 },
            avgCycleDays: { type: 'number', example: 18.6 },
          },
        },
        goal: {
          type: 'object',
          example: {
            '2024-06-18': [
              /*snapshots*/
            ],
          },
        },
      },
    },
  })
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('funnelId') funnelId?: string,
  ) {
    const overview = await this.crmDashboardService.getOverview(
      startDate,
      endDate,
      funnelId,
    );
    const goal = await this.crmFunnelService.getFunnelGoalsHistory(
      startDate,
      endDate,
    );
    // Buscar todos os funis disponíveis para o filtro
    const allFunnels = await this.crmFunnelService.findAll();
    const funnelsList = allFunnels.map((funnel) => ({
      id: funnel.id,
      name: funnel.name,
    }));

    return {
      overview: overview.overview,
      goal,
      funnels: funnelsList, // Lista de todos os funis disponíveis
    };
  }
}
