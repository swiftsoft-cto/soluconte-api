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
import { CrmContactsService } from './crm-contacts.service';
import { CreateCrmContactDto } from './dtos/create-crm-contact.dto';
import { UpdateCrmContactDto } from './dtos/update-crm-contact.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';

@ApiTags('CRM Contacts')
@Controller('api/crm/contacts')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class CrmContactsController {
  constructor(private readonly crmContactsService: CrmContactsService) {}

  @Post()
  @Rule('crm-contacts.create')
  @ApiOperation({ summary: 'Create a new CRM contact' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createCrmContactDto: CreateCrmContactDto) {
    return this.crmContactsService.create(createCrmContactDto);
  }

  @Get()
  @Rule('crm-contacts.paginate')
  @ApiOperation({
    summary: 'Get all CRM contacts with pagination and filtering',
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
    description: 'Filter by name, surname, email or phone',
  })
  @ApiResponse({ status: 200, description: 'Return all contacts' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filter') filter?: string,
  ) {
    return this.crmContactsService.findAll(page, limit, filter);
  }

  @Get(':id')
  @Rule('crm-contacts.findOne')
  @ApiOperation({ summary: 'Get a CRM contact by id' })
  @ApiResponse({ status: 200, description: 'Return the contact' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  findOne(@Param('id') id: string) {
    return this.crmContactsService.findOne(id);
  }

  @Patch(':id')
  @Rule('crm-contacts.update')
  @ApiOperation({ summary: 'Update a CRM contact' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  update(
    @Param('id') id: string,
    @Body() updateCrmContactDto: UpdateCrmContactDto,
  ) {
    return this.crmContactsService.update(id, updateCrmContactDto);
  }

  @Delete(':id')
  @Rule('crm-contacts.delete')
  @ApiOperation({ summary: 'Delete a CRM contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  remove(@Param('id') id: string) {
    return this.crmContactsService.remove(id);
  }
}
