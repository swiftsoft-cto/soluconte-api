// src/modules/departments/departments.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Delete,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { User } from 'src/common/decorators/user.decorator';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Rule } from 'src/common/decorators/rule.decorator';

@UseGuards(JwtAuthGuard, RulesGuard)
@Controller('api/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  /**
   * Cria um novo departamento na empresa selecionada
   */
  @Rule('departments.create')
  @Post('/')
  async create(
    @Body() createDto: CreateDepartmentDto,
    @User('selectedCompany') selectedCompany: Company,
  ) {
    return this.departmentsService.createDepartment(createDto, selectedCompany);
  }

  /**
   * Lista todos os departamentos da empresa selecionada
   */
  @Rule('departments.findAll')
  @Get('/')
  async findAll(@User('selectedCompany') selectedCompany: Company) {
    return this.departmentsService.findAllByCompany(selectedCompany.id);
  }

  /**
   * Retorna departamentos paginados da empresa selecionada
   */
  @Rule('departments.paginate')
  @Get('/paginate/departments')
  async paginate(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('filter') filter: string,
    @User('selectedCompany') selectedCompany: Company,
  ) {
    return this.departmentsService.paginate(
      +limit || 10,
      +page || 1,
      selectedCompany.id,
      filter,
    );
  }

  /**
   * Retorna departamentos para uso em selects/formulários
   * Acesso liberado para qualquer usuário autenticado da empresa selecionada
   * (não requer permissão específica, pois é necessário para uso em formulários)
   */
  @UseGuards(JwtAuthGuard)
  @Get('/select')
  async select(@User() currentUser: any, @User('selectedCompany') selectedCompany: Company) {
    if (!selectedCompany) {
      throw new BadRequestException('Usuário não possui empresa selecionada.');
    }
    
    console.log('[GET /departments/select]', {
      selectedCompanyId: selectedCompany.id,
      userId: currentUser.id,
      isMaster: currentUser.isMaster
    });
    
    const departments = await this.departmentsService.findAllByCompany(selectedCompany.id);
    
    console.log('[GET /departments/select] Retornando', departments.length, 'departamentos');
    
    return departments;
  }

  /**
   * Lista todos os departamentos de uma empresa por ID (para select no upload de documentos do cliente).
   * Quem tem permissão de upload pode listar departamentos do cliente selecionado.
   */
  @Rule('file-management.upload')
  @Get('by-company/:companyId')
  async findByCompany(@Param('companyId') companyId: string) {
    return this.departmentsService.findAllByCompany(companyId);
  }

  /**
   * Retorna um departamento específico (se pertencer à empresa selecionada)
   */
  @Rule('departments.findOne')
  @Get('/:id')
  async findOne(
    @Param('id') id: string,
    @User('selectedCompany') selectedCompany: Company,
  ) {
    const department = await this.departmentsService.findOneById(id);
    if (!department || department.company.id !== selectedCompany.id) {
      throw new NotFoundException(
        'Department not found or does not belong to your selected company',
      );
    }
    return department;
  }

  /**
   * Atualiza um departamento existente (se pertencer à empresa selecionada)
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDepartmentDto,
    @User('selectedCompany') selectedCompany: Company,
  ) {
    return this.departmentsService.updateDepartment(
      id,
      selectedCompany.id,
      updateDto,
    );
  }

  /**
   * Deleta (soft-delete) um departamento da empresa selecionada
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @User('selectedCompany') selectedCompany: Company,
    @User() currentUser: any,
  ) {
    return this.departmentsService.removeDepartment(
      id,
      selectedCompany.id,
      currentUser,
    );
  }
}
