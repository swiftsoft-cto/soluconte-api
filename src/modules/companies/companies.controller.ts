// src/modules/companies/companies.controller.ts
import {
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { Rule } from 'src/common/decorators/rule.decorator';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { StorageService } from '../storage/storage.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('api/companies')
@UseGuards(JwtAuthGuard, RulesGuard)
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Lista/filtra empresas com paginação' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Quantidade de itens por página',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Número da página',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: 'string',
    description: 'Filtro por nome da empresa',
  })
  @ApiQuery({
    name: 'all',
    required: false,
    type: 'boolean',
    description: 'Se verdadeiro, retorna todas as empresas sem paginação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas retornada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados/filtros inválidos.',
    type: BadRequestException,
  })
  @Rule('customers.view')
  @Get('/')
  async paginate(
    @Req() req: any,
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('filter') filter?: string,
    @Query('root') rootUsers?: string,
    @Query('all') all?: string,
  ) {
    const isRootUser = rootUsers === 'true';
    const returnAll = all === 'true'; // Verifica se o parâmetro "all" foi enviado como "true"
    return this.companiesService.paginate(
      +limit || 10,
      +page || 1,
      filter,
      isRootUser,
      req.language,
      returnAll,
    );
  }

  /**
   * Retorna a empresa baseada no id do recebido por parametro.
   * O ID é obrigatório.
   */
  @Get('find/:id')
  @Rule('company.findOne')
  async getCompanyById(@Param('id') companyId: string) {
    if (!companyId) {
      // Caso o ID da empresa não seja fornecido
      return {
        message: 'Nenhuma empresa encontrada com o ID fornecido.',
        statusCode: 404,
        data: null,
      };
    }

    const company = await this.companiesService.findOne(companyId);

    if (!company) {
      // Caso a empresa não seja encontrada
      return {
        message: 'Empresa não encontrada.',
        statusCode: 404,
        data: null,
      };
    }

    return {
      message: 'Empresa recuperada com sucesso.',
      statusCode: 200,
      data: company,
    };
  }

  /**
   * Atualiza a empresa baseada no id dela.
   */
  @Patch('selected/:id')
  @Rule('customers.update')
  @UseInterceptors(FileInterceptor('file')) // Intercepta o arquivo enviado
  async updateCompanyById(
    @Param('id') companyId: string,
    @Body() updateDto: UpdateCompanyDto,
    @UploadedFile() file: Express.Multer.File, // Recebe o arquivo enviado
  ) {
    const booleanFields = ['simpleOption', 'simeiOption']; // Liste os campos que precisam ser convertidos
    booleanFields.forEach((field) => {
      if (updateDto[field] === 'true') {
        updateDto[field] = true;
      } else if (updateDto[field] === 'false') {
        updateDto[field] = false;
      }
    });

    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'companies'); // Usa o serviço de storage
    }

    if (imageUrl) {
      updateDto.imageUrl = imageUrl;
    }

    const updated = await this.companiesService.update(companyId, updateDto);

    return {
      message: 'Company updated successfully',
      statusCode: 200,
      data: updated,
    };
  }

  /**
   * Retorna a empresa selecionada do usuário logado.
   * Precisamos do user logado para obter `user.selectedCompany.id`.
   */
  @Get('selected')
  @Rule('company.findOne')
  async getSelectedCompany(@User() currentUser: any) {
    const selectedCompanyId = currentUser.selectedCompany?.id;
    if (!selectedCompanyId) {
      // Caso o usuário não tenha empresa selecionada
      // Ajuste a mensagem/erro conforme necessidade
      return {
        message: 'Nenhuma empresa selecionada para este usuário.',
        statusCode: 200,
        data: null,
      };
    }

    const company = await this.companiesService.findOne(selectedCompanyId);

    return {
      message: 'Company retrieved successfully',
      statusCode: 200,
      data: company,
    };
  }

  /**
   * Atualiza a empresa selecionada do usuário logado.
   */
  @Patch('selected')
  @Rule('company.update')
  @UseInterceptors(FileInterceptor('file')) // Intercepta o arquivo enviado
  async updateSelectedCompany(
    @User() currentUser: any,
    @Body() updateDto: UpdateCompanyDto,
    @UploadedFile() file: Express.Multer.File, // Recebe o arquivo enviado
  ) {
    if (typeof (updateDto as any).chatSettings === 'string') {
      try {
        (updateDto as any).chatSettings = JSON.parse((updateDto as any).chatSettings);
      } catch {
        (updateDto as any).chatSettings = undefined;
      }
    }
    const booleanFields = ['simpleOption', 'simeiOption']; // Liste os campos que precisam ser convertidos
    booleanFields.forEach((field) => {
      if (updateDto[field] === 'true') {
        updateDto[field] = true;
      } else if (updateDto[field] === 'false') {
        updateDto[field] = false;
      }
    });

    const selectedCompanyId = currentUser.selectedCompany?.id;
    if (!selectedCompanyId) {
      return {
        message: 'Nenhuma empresa selecionada para este usuário.',
        statusCode: 400,
        data: null,
      };
    }
    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'companies'); // Usa o serviço de storage
    }

    if (imageUrl) {
      updateDto.imageUrl = imageUrl;
    }

    const updated = await this.companiesService.update(
      selectedCompanyId,
      updateDto,
    );

    return {
      message: 'Company updated successfully',
      statusCode: 200,
      data: updated,
    };
  }

  @Get('/findAll')
  async findAll() {
    return await this.companiesService.findAll();
  }
}
