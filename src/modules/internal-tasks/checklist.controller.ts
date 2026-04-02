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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { User } from '../../common/decorators/user.decorator';
import { User as UserEntity } from '../users/entities/user.entity';
import { ChecklistService } from './checklist.service';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { ChecklistResponseDto } from './dtos/checklist-response.dto';
import { UpdateTaskChecklistItemDto } from './dtos/task-checklist-item.dto';
import { TaskChecklistProgressDto } from './dtos/task-checklist-item.dto';

@Controller('api/checklists')
@UseGuards(JwtAuthGuard, RulesGuard)
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  // ============================== CRIAÇÃO DE CHECKLISTS ==============================

  @Post()
  async create(
    @Body() createChecklistDto: CreateChecklistDto,
    @User() currentUser: UserEntity,
  ): Promise<ChecklistResponseDto> {
    return this.checklistService.createChecklist(createChecklistDto, currentUser);
  }

  // ============================== DEBUG ==============================

  @Get('debug/all')
  async debugFindAll(): Promise<any[]> {
    return this.checklistService.debugFindAllChecklists();
  }

  @Get('debug/with-filters')
  async debugWithFilters(@User() currentUser: UserEntity): Promise<any[]> {
    return this.checklistService.debugFindAllWithFilters(currentUser);
  }

  // ============================== LISTAGEM DE CHECKLISTS ==============================

  @Get()
  async findAll(
    @User() currentUser: UserEntity,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<{
    data: ChecklistResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    const filters = {
      search,
      type: type as any,
      isTemplate: isTemplate === 'true',
      departmentId,
    };

    return this.checklistService.findAll(currentUser, pageNumber, limitNumber, filters);
  }

  @Get('templates')
  async findTemplates(@User() currentUser: UserEntity): Promise<ChecklistResponseDto[]> {
    return this.checklistService.findTemplates(currentUser);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @User() currentUser: UserEntity,
  ): Promise<ChecklistResponseDto> {
    return this.checklistService.findOne(id, currentUser);
  }

  // ============================== ATUALIZAÇÃO DE CHECKLISTS ==============================

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateChecklistDto: UpdateChecklistDto,
    @User() currentUser: UserEntity,
  ): Promise<ChecklistResponseDto> {
    return this.checklistService.update(id, updateChecklistDto, currentUser);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @User() currentUser: UserEntity,
  ): Promise<void> {
    return this.checklistService.delete(id, currentUser);
  }

  // ============================== GESTÃO DE CHECKLISTS EM TAREFAS ==============================

  @Post('tasks/:taskId/associate/:checklistId')
  async associateChecklistToTask(
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @User() currentUser: UserEntity,
  ): Promise<void> {
    return this.checklistService.associateChecklistToTask(taskId, checklistId, currentUser);
  }

  @Get('tasks/:taskId')
  async getTaskChecklist(
    @Param('taskId') taskId: string,
    @User() currentUser: UserEntity,
  ): Promise<{
    checklist: ChecklistResponseDto;
    items: any[];
    progress: TaskChecklistProgressDto;
  }> {
    return this.checklistService.getTaskChecklist(taskId, currentUser);
  }

  @Patch('tasks/:taskId/items/:itemId')
  async updateTaskChecklistItem(
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateTaskChecklistItemDto,
    @User() currentUser: UserEntity,
  ): Promise<any> {
    return this.checklistService.updateTaskChecklistItem(taskId, itemId, updateDto, currentUser);
  }

  @Get('tasks/:taskId/progress')
  async getTaskChecklistProgress(
    @Param('taskId') taskId: string,
    @User() currentUser: UserEntity,
  ): Promise<TaskChecklistProgressDto> {
    // Primeiro verificar se o usuário tem acesso à tarefa
    await this.checklistService.getTaskChecklist(taskId, currentUser);
    
    return this.checklistService.calculateTaskChecklistProgress(taskId);
  }
}
