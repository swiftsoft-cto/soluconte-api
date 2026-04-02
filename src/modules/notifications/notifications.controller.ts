import {
  Controller,
  Get,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('Notifications')
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as notificações do usuário atual' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada com sucesso',
  })
  findAll(@Query() query: any, @User('id') userId: string) {
    return this.notificationsService.findAll({ ...query, userId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma notificação por ID' })
  @ApiResponse({
    status: 200,
    description: 'Notificação encontrada com sucesso',
  })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida com sucesso',
  })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma notificação' })
  @ApiResponse({ status: 200, description: 'Notificação removida com sucesso' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
