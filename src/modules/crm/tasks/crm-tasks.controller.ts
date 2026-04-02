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
} from '@nestjs/swagger';
import { CrmTasksService } from './crm-tasks.service';
import { CreateCrmTaskDto } from './dtos/create-crm-task.dto';
import { UpdateCrmTaskDto } from './dtos/update-crm-task.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';

@ApiTags('CRM Tasks')
@Controller('api/crm/tasks')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class CrmTasksController {
  constructor(private readonly crmTasksService: CrmTasksService) {}

  @Post()
  @Rule('crm-tasks.create')
  @ApiOperation({ summary: 'Criar uma nova tarefa' })
  @ApiResponse({ status: 201, description: 'Tarefa criada com sucesso' })
  create(@Body() createCrmTaskDto: CreateCrmTaskDto) {
    return this.crmTasksService.create(createCrmTaskDto);
  }

  @Get()
  @Rule('crm-tasks.findAll')
  @ApiOperation({ summary: 'Listar todas as tarefas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tarefas retornada com sucesso',
  })
  findAll(@Query() query: any) {
    return this.crmTasksService.findAll(query);
  }

  @Get(':id')
  @Rule('crm-tasks.findOne')
  @ApiOperation({ summary: 'Buscar uma tarefa por ID' })
  @ApiResponse({ status: 200, description: 'Tarefa encontrada com sucesso' })
  findOne(@Param('id') id: string) {
    return this.crmTasksService.findOne(id);
  }

  @Patch(':id')
  @Rule('crm-tasks.update')
  @ApiOperation({ summary: 'Atualizar uma tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa atualizada com sucesso' })
  update(@Param('id') id: string, @Body() updateCrmTaskDto: UpdateCrmTaskDto) {
    return this.crmTasksService.update(id, updateCrmTaskDto);
  }

  @Delete(':id')
  @Rule('crm-tasks.delete')
  @ApiOperation({ summary: 'Remover uma tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa removida com sucesso' })
  remove(@Param('id') id: string) {
    return this.crmTasksService.remove(id);
  }
}
