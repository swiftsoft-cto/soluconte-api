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
import { CrmCompaniesService } from './crm-companies.service';
import { CreateCrmCompanyDto } from './dtos/create-crm-company.dto';
import { UpdateCrmCompanyDto } from './dtos/update-crm-company.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';

@ApiTags('CRM Companies')
@Controller('api/crm/companies')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class CrmCompaniesController {
  constructor(private readonly crmCompaniesService: CrmCompaniesService) {}

  @Post()
  @Rule('crm-companies.create')
  @ApiOperation({ summary: 'Create a new CRM company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createCrmCompanyDto: CreateCrmCompanyDto) {
    return this.crmCompaniesService.create(createCrmCompanyDto);
  }

  @Get()
  @Rule('crm-companies.paginate')
  @ApiOperation({
    summary: 'Get all CRM companies with pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    description: 'Filter by name, business name or CNPJ',
  })
  @ApiResponse({ status: 200, description: 'Return all companies' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filter') filter?: string,
  ) {
    return this.crmCompaniesService.findAll(page, limit, filter);
  }

  @Get(':id')
  @Rule('crm-companies.findOne')
  @ApiOperation({ summary: 'Get a CRM company by id' })
  @ApiResponse({ status: 200, description: 'Return the company' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string) {
    return this.crmCompaniesService.findOne(id);
  }

  @Patch(':id')
  @Rule('crm-companies.update')
  @ApiOperation({ summary: 'Update a CRM company' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  update(
    @Param('id') id: string,
    @Body() updateCrmCompanyDto: UpdateCrmCompanyDto,
  ) {
    return this.crmCompaniesService.update(id, updateCrmCompanyDto);
  }

  @Delete(':id')
  @Rule('crm-companies.delete')
  @ApiOperation({ summary: 'Delete a CRM company' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  remove(@Param('id') id: string) {
    return this.crmCompaniesService.remove(id);
  }
}
