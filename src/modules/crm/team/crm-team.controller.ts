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
import { CrmTeamService } from './crm-team.service';
import { CreateCrmTeamDto } from './dtos/create-crm-team.dto';
import { UpdateCrmTeamDto } from './dtos/update-crm-team.dto';
import { UpdateTeamUsersDto } from './dtos/update-team-users.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';

@ApiTags('CRM Teams')
@Controller('api/crm/teams')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class CrmTeamController {
  constructor(private readonly crmTeamService: CrmTeamService) {}

  @Post()
  @Rule('crm-teams.create')
  @ApiOperation({ summary: 'Create a new CRM team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createCrmTeamDto: CreateCrmTeamDto) {
    return this.crmTeamService.create(createCrmTeamDto);
  }

  @Get()
  @Rule('crm-teams.paginate')
  @ApiOperation({ summary: 'Get all CRM teams with pagination and filtering' })
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
    description: 'Filter by name',
  })
  @ApiResponse({ status: 200, description: 'Return all teams' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filter') filter?: string,
  ) {
    return this.crmTeamService.findAll(page, limit, filter);
  }

  @Get(':id')
  @Rule('crm-teams.findOne')
  @ApiOperation({ summary: 'Get a CRM team by id' })
  @ApiResponse({ status: 200, description: 'Return the team' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  findOne(@Param('id') id: string) {
    return this.crmTeamService.findOne(id);
  }

  @Patch(':id')
  @Rule('crm-teams.update')
  @ApiOperation({ summary: 'Update a CRM team' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  update(@Param('id') id: string, @Body() updateCrmTeamDto: UpdateCrmTeamDto) {
    return this.crmTeamService.update(id, updateCrmTeamDto);
  }

  @Delete(':id')
  @Rule('crm-teams.delete')
  @ApiOperation({ summary: 'Delete a CRM team' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  remove(@Param('id') id: string) {
    return this.crmTeamService.remove(id);
  }

  @Patch(':id/users')
  @Rule('crm-teams.update')
  @ApiOperation({ summary: 'Update team users' })
  @ApiResponse({ status: 200, description: 'Team users updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  updateTeamUsers(
    @Param('id') id: string,
    @Body() updateTeamUsersDto: UpdateTeamUsersDto,
  ) {
    return this.crmTeamService.updateTeamUsers(id, updateTeamUsersDto);
  }
}
