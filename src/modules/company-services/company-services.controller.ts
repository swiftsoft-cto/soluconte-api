// src/modules/company-services/company-services.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';
import { CompanyServicesService } from './company-services.service';
import { User } from 'src/common/decorators/user.decorator';

@Controller('api/company-services')
@UseGuards(JwtAuthGuard, RulesGuard)
export class CompanyServicesController {
  constructor(private readonly csService: CompanyServicesService) {}

  /**
   * Criar vínculo: POST /api/company-services
   * Body: { "serviceId": "<uuid-do-servico>" }
   */
  @Rule('company-services.create', 'team')
  @Post()
  async create(
    @Body() { serviceId }: { serviceId: string },
    @User() currentUser: any,
  ) {
    const relation = await this.csService.createRelation(
      serviceId,
      currentUser,
    );

    // Retorna no formato desejado
    return {
      message: 'Serviço relacionado com sucesso.',
      statusCode: 201,
      data: relation, // ou só relation.service se quiser
    };
  }

  /**
   * Listar serviços da empresa selecionada com paginação
   * GET /api/company-services?page=1&limit=10
   */
  @Rule('company-services.findAll')
  @Get()
  async findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @User() currentUser: any,
  ) {
    const {
      data,
      total,
      page: currentPage,
      last_page,
    } = await this.csService.findRelationsPaginated(currentUser, page, limit);

    // Monta a resposta no formato customizado
    return {
      message: 'Serviços retornados com sucesso.',
      statusCode: 200,
      data: {
        items: data, // array de services
        totalItems: total,
        totalPages: last_page,
        currentPage,
      },
    };
  }

  /**
   * Desrelacionar (excluir) pelo ID do serviço
   * DELETE /api/company-services/:serviceId
   */
  @Rule('company-services.remove', 'team')
  @Delete(':serviceId')
  async remove(
    @Param('serviceId') serviceId: string,
    @User() currentUser: any,
  ) {
    const result = await this.csService.removeRelation(serviceId, currentUser);

    return {
      message: 'Serviço removido da empresa com sucesso.',
      statusCode: 200,
      data: result,
    };
  }
}
