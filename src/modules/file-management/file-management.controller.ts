import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { FileManagementService } from './file-management.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { Rule } from '../../common/decorators/rule.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../users/entities/user.entity';
import { CreateFileDto } from './dtos/create-file.dto';
import { ListFilesDto } from './dtos/list-files.dto';
import { CreateNotificationEmailDto } from './dtos/create-notification-email.dto';
import { UpdateNotificationEmailDto } from './dtos/update-notification-email.dto';
import { CreateNotificationWhatsAppDto } from './dtos/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsAppDto } from './dtos/update-notification-whatsapp.dto';
import { SendCommunicationDto } from './dtos/send-communication.dto';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('File Management')
@Controller('api/file-management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileManagementController {
  constructor(
    private readonly fileManagementService: FileManagementService,
  ) {}

  @Post('upload')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de arquivo (apenas usuários internos)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        companyId: { type: 'string' },
        departmentId: { type: 'string', description: 'Opcional; sem valor = Geral' },
        year: { type: 'number' },
        month: { type: 'number' },
        description: { type: 'string' },
        sendToClient: { type: 'boolean' },
      },
      required: ['file', 'companyId', 'year', 'month'],
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: User },
    @Body('companyId') companyId: string,
    @Body('year', ParseIntPipe) year: number,
    @Body('month', ParseIntPipe) month: number,
    @Body('departmentId') departmentId?: string,
    @Body('description') description?: string,
    @Body('sendToClient') sendToClient?: string,
  ) {
    // Converter string para boolean (form-data envia como string)
    let sendToClientBool: boolean | undefined;
    if (sendToClient !== undefined) {
      sendToClientBool = sendToClient === 'true' || sendToClient === '1';
    }

    const createFileDto: CreateFileDto = {
      companyId,
      departmentId: departmentId || undefined,
      year,
      month,
      description,
      sendToClient: sendToClientBool,
    };
    return this.fileManagementService.uploadFile(
      file,
      createFileDto,
      req.user,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar arquivos (clientes veem apenas seus arquivos)',
  })
  async listFiles(
    @Query() listFilesDto: ListFilesDto,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.listFiles(listFilesDto, req.user);
  }

  @Get('structure')
  @ApiOperation({
    summary: 'Obter estrutura de pastas (anos e meses disponíveis)',
  })
  async getFolderStructure(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    return this.fileManagementService.getFolderStructure(companyId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter arquivo por ID' })
  async getFileById(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.getFileById(id, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download de arquivo' })
  async downloadFile(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Res() res: Response,
  ) {
    const result = await this.fileManagementService.downloadFile(
      id,
      req.user,
    );

    // Codificar o nome do arquivo para suportar caracteres especiais
    const encodedFilename = encodeURIComponent(result.filename);
    
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': result.file.length.toString(),
    });

    res.send(result.file);
  }

  @Delete(':id')
  @UseGuards(RulesGuard)
  @Rule('file-management.delete')
  @ApiOperation({ summary: 'Deletar arquivo (apenas usuários internos)' })
  async deleteFile(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    await this.fileManagementService.deleteFile(id, req.user);
    return { message: 'Arquivo deletado com sucesso.' };
  }

  @Post(':id/send-to-client')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @ApiOperation({
    summary:
      'Enviar (ou reenviar) notificações deste arquivo para o cliente (apenas usuários internos)',
  })
  async sendFileToClient(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    const file = await this.fileManagementService.sendFileToClient(
      id,
      req.user,
    );
    return {
      message: 'Notificações enviadas para o cliente com sucesso.',
      file,
    };
  }

  // ========== Endpoints de Emails de Notificação ==========

  @Get('notification-emails/:companyId')
  @ApiOperation({
    summary: 'Listar emails de notificação de um cliente',
  })
  async listNotificationEmails(
    @Param('companyId') companyId: string,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.listNotificationEmails(companyId, req.user);
  }

  @Post('notification-emails')
  @ApiOperation({
    summary: 'Criar email de notificação (máximo 5 por cliente)',
  })
  async createNotificationEmail(
    @Body() createDto: CreateNotificationEmailDto,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.createNotificationEmail(createDto, req.user);
  }

  @Put('notification-emails/:id')
  @ApiOperation({ summary: 'Atualizar email de notificação' })
  async updateNotificationEmail(
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationEmailDto,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.updateNotificationEmail(id, updateDto, req.user);
  }

  @Delete('notification-emails/:id')
  @ApiOperation({ summary: 'Deletar email de notificação' })
  async deleteNotificationEmail(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    await this.fileManagementService.deleteNotificationEmail(id, req.user);
    return { message: 'Email de notificação deletado com sucesso.' };
  }

  // ========== Endpoints de WhatsApp de Notificação ==========

  @Get('notification-whatsapp/:companyId')
  @ApiOperation({
    summary: 'Listar números WhatsApp de notificação de um cliente',
  })
  async listNotificationWhatsApp(
    @Param('companyId') companyId: string,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.listNotificationWhatsApp(companyId, req.user);
  }

  @Post('notification-whatsapp')
  @ApiOperation({
    summary: 'Criar número WhatsApp de notificação (máximo 1 por cliente)',
  })
  async createNotificationWhatsApp(
    @Body() createDto: CreateNotificationWhatsAppDto,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.createNotificationWhatsApp(createDto, req.user);
  }

  @Put('notification-whatsapp/:id')
  @ApiOperation({ summary: 'Atualizar número WhatsApp de notificação' })
  async updateNotificationWhatsApp(
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationWhatsAppDto,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.updateNotificationWhatsApp(id, updateDto, req.user);
  }

  @Delete('notification-whatsapp/:id')
  @ApiOperation({ summary: 'Deletar número WhatsApp de notificação' })
  async deleteNotificationWhatsApp(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    await this.fileManagementService.deleteNotificationWhatsApp(id, req.user);
    return { message: 'Número WhatsApp de notificação deletado com sucesso.' };
  }

  @Get('communication/targets')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @ApiOperation({ summary: 'Listar destinos (grupos WhatsApp) para comunicação' })
  async getCommunicationTargets(
    @Query('departmentId') departmentId: string | undefined,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.getCommunicationTargets(departmentId, req.user);
  }

  @Post('communication/send')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @ApiOperation({ summary: 'Enviar mensagem de texto para grupos WhatsApp' })
  async sendCommunication(
    @Body() dto: SendCommunicationDto,
    @Request() req: { user: User },
  ) {
    return this.fileManagementService.sendCommunicationMessage(
      dto.message,
      dto.departmentId,
      req.user,
    );
  }
}

