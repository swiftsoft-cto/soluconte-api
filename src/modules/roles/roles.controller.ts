// src/modules/roles/roles.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';
import { User } from 'src/common/decorators/user.decorator';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';

@Controller('api/roles')
@UseGuards(JwtAuthGuard, RulesGuard) // Protegendo as rotas com JWT + Rules
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // src/modules/roles/roles.controller.ts

  @Get('/organization-chart')
  async getOrganizationChart(@User() currentUser: any) {
    return this.rolesService.getOrganizationChart(currentUser);
  }

  // ========== Criação ==========
  @Post('/')
  @Rule('roles.create')
  async create(@Body() dto: CreateRoleDto, @User() currentUser: any) {
    return this.rolesService.create(dto, currentUser);
  }

  // ========== findAll (sem paginação) ==========
  @Get('/')
  @Rule('roles.findAll')
  async findAll(@User() currentUser: any) {
    return this.rolesService.findAll(currentUser);
  }

  // ========== findOne ==========
  @Get('/:id')
  @Rule('roles.findOne')
  async findOne(@Param('id') id: string, @User() currentUser: any) {
    return this.rolesService.findOne(id, currentUser);
  }

  // ========== Paginate ==========
  @Get('/paginate/roles') // ou '/paginate' se preferir
  @Rule('roles.paginate')
  async paginate(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('filter') filter: string,
    @Query('companyParam') companyParam: string,
    @User() currentUser: any,
  ) {
    return this.rolesService.paginate(
      +limit || 10,
      +page || 1,
      filter,
      currentUser,
      companyParam,
    );
  }

  // ========== Update ==========
  @Patch('/:id')
  @Rule('roles.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @User() currentUser: any,
  ) {
    return this.rolesService.update(id, dto, currentUser);
  }

  // ========== Delete (soft-delete) ==========
  @Delete('/:id')
  @Rule('roles.delete')
  async remove(@Param('id') id: string, @User() currentUser: any) {
    await this.rolesService.remove(id, currentUser);
    return { message: 'Role removida com sucesso.' };
  }
}
