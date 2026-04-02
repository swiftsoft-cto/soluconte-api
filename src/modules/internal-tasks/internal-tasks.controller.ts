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
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { InternalTasksService } from './internal-tasks.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { CreateKanbanDto } from './dtos/create-kanban.dto';
import { CreateColumnDto } from './dtos/create-column.dto';
import { UpdateColumnDto } from './dtos/update-column.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { Rule } from '../../common/decorators/rule.decorator';
import { User } from '../users/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import { Response } from 'express';

@Controller('api/internal-tasks')
@UseGuards(JwtAuthGuard)
export class InternalTasksController {
  constructor(
    private readonly internalTasksService: InternalTasksService,
    private readonly storageService: StorageService,
  ) {}

  // ============================== TAREFAS ==============================

  @Post()
  @UseGuards(RulesGuard)
  @Rule('internal-tasks.create')
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: { user: User }) {
    return this.internalTasksService.createTask(createTaskDto, req.user);
  }

  @Get()
  @UseGuards(RulesGuard)
  @Rule('internal-tasks.view')
  findAll(
    @Request() req: { user: User },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('priority') priority?: string,
    @Query('customerId') customerId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('kanbanId') kanbanId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      search,
      priority,
      customerId,
      departmentId,
      responsibleId,
      kanbanId,
      startDate,
      endDate,
    };

    return this.internalTasksService.findAll(
      req.user,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      filters,
    );
  }

  // Templates
  @Get('templates')
  @UseGuards(RulesGuard)
  @Rule('internal-tasks.view')
  findTemplates(@Request() req: { user: User }) {
    return this.internalTasksService.findTemplates(req.user);
  }

  // ============================== KANBANS ==============================

  @Post('kanbans')
  createKanban(
    @Body() createKanbanDto: CreateKanbanDto,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.createKanban(createKanbanDto, req.user);
  }

  @Get('kanbans')
  findAllKanbans(@Request() req: { user: User }) {
    return this.internalTasksService.findAllKanbans(req.user);
  }

  @Get('kanbans/:id')
  findOneKanban(@Param('id') id: string, @Request() req: { user: User }) {
    return this.internalTasksService.findKanbanById(id, req.user);
  }

  // ============================== COLUNAS ==============================

  @Post('columns')
  createColumn(
    @Body() createColumnDto: CreateColumnDto,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.createColumn(createColumnDto, req.user);
  }

  @Get('columns')
  findAllColumns(@Request() req: { user: User }) {
    return this.internalTasksService.findAllColumns(req.user);
  }

  @Get('columns/:id')
  findColumnById(@Param('id') id: string, @Request() req: { user: User }) {
    return this.internalTasksService.findColumnById(id, req.user);
  }

  @Patch('columns/:id')
  updateColumn(
    @Param('id') id: string,
    @Body() updateColumnDto: UpdateColumnDto,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.updateColumn(
      id,
      updateColumnDto,
      req.user,
    );
  }

  @Delete('columns/:id')
  deleteColumn(@Param('id') id: string, @Request() req: { user: User }) {
    return this.internalTasksService.deleteColumn(id, req.user);
  }

  @Get('my-tasks')
  findMyTasks(
    @Request() req: { user: User },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('priority') priority?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      search,
      priority,
      startDate,
      endDate,
    };

    return this.internalTasksService.findMyTasks(
      req.user,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      filters,
    );
  }

  @Get('department/:departmentId')
  findDepartmentTasks(
    @Param('departmentId') departmentId: string,
    @Request() req: { user: User },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('priority') priority?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      search,
      priority,
      startDate,
      endDate,
    };

    return this.internalTasksService.findDepartmentTasks(
      departmentId,
      req.user,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      filters,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: User }) {
    return this.internalTasksService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.update(id, updateTaskDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: User }) {
    return this.internalTasksService.remove(id, req.user);
  }

  @Patch(':id/move')
  moveTask(
    @Param('id') id: string,
    @Body() moveData: { columnId: string; order: number },
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.moveTask(
      id,
      moveData.columnId,
      moveData.order,
      req.user,
    );
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.uploadAttachment(taskId, file, req.user);
  }

  @Get(':id/attachments')
  async getAttachments(
    @Param('id') taskId: string,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.getAttachments(taskId, req.user);
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Request() req: { user: User },
    @Res() res: Response,
  ) {
    const result = await this.internalTasksService.downloadAttachment(
      attachmentId,
      req.user,
    );

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });

    res.send(result.file);
  }

  // ✅ NOVO ENDPOINT: Excluir anexo de tarefa
  @Delete(':id/attachments/:attachmentId')
  async deleteAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.deleteAttachment(attachmentId, req.user);
  }

  // ============================== COMENTÁRIOS ==============================

  @Post(':id/comments')
  createComment(
    @Param('id') taskId: string,
    @Body() commentData: { content: string },
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.addComment(
      taskId,
      commentData.content,
      req.user,
    );
  }

  @Get(':id/comments')
  getComments(@Param('id') taskId: string, @Request() req: { user: User }) {
    return this.internalTasksService.getComments(taskId, req.user);
  }

  @Patch('comments/:commentId')
  updateComment(
    @Param('commentId') commentId: string,
    @Body() commentData: { content: string },
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.updateComment(
      commentId,
      commentData.content,
      req.user,
    );
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.deleteComment(commentId, req.user);
  }

  // ============================== CHECKLIST ==============================

  @Delete(':id/checklist')
  removeChecklistFromTask(
    @Param('id') taskId: string,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.removeChecklistFromTask(taskId, req.user);
  }

  // ============================== CRONÔMETRO ==============================

  @Post(':id/timer/start')
  startTimer(
    @Param('id') taskId: string,
    @Body() startTimeDto: any,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.startTimer(taskId, req.user, startTimeDto);
  }

  @Post(':id/timer/stop')
  stopTimer(
    @Param('id') taskId: string,
    @Body() stopTimeDto: any,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.stopTimer(taskId, req.user, stopTimeDto);
  }

  @Post(':id/timer/pause')
  pauseTimer(
    @Param('id') taskId: string,
    @Body() pauseTimeDto: any,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.pauseTimer(taskId, req.user, pauseTimeDto);
  }

  @Post(':id/timer/resume')
  resumeTimer(
    @Param('id') taskId: string,
    @Body() resumeTimeDto: any,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.resumeTimer(
      taskId,
      req.user,
      resumeTimeDto,
    );
  }

  @Get(':id/timer/stats')
  getTaskTimeStats(
    @Param('id') taskId: string,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.getTaskTimeStats(taskId, req.user);
  }

  @Get(':id/timer/user/:userId')
  getUserTimeEntries(
    @Param('id') taskId: string,
    @Param('userId') userId: string,
    @Request() req: { user: User },
  ) {
    return this.internalTasksService.getUserTimeEntries(
      taskId,
      userId,
      req.user,
    );
  }
}
