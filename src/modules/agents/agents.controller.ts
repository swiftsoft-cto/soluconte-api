import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { UpdateAgentDto } from './dtos/update-agent.dto';
import { StorageService } from '../storage/storage.service';

@Controller('api/agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar agente' })
  @ApiResponse({ status: 201, description: 'Agente criado.' })
  async create(@User() user: any, @Body() dto: CreateAgentDto) {
    const companyId = user.selectedCompany?.id ?? null;
    const agent = await this.agentsService.create(user.id, companyId, dto);
    return { message: 'Agente criado.', statusCode: 201, data: agent };
  }

  @Get()
  @ApiOperation({ summary: 'Listar agentes do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de agentes.' })
  async findAll(@User() user: any) {
    const companyId = user.selectedCompany?.id ?? null;
    const agents = await this.agentsService.findAllByUser(user.id, companyId);
    return { message: 'OK', statusCode: 200, data: agents };
  }

  @Get('for-chat')
  @ApiOperation({ summary: 'Listar agentes disponíveis para o chat (balão)' })
  @ApiResponse({ status: 200, description: 'Agentes: dono + geral + cliente (personalizado para a empresa do usuário).' })
  async findForChat(@User() user: any) {
    const companyId = user.selectedCompany?.id ?? null;
    const agents = await this.agentsService.findForChat(user.id, companyId, !!user.isRootUser);
    return { message: 'OK', statusCode: 200, data: agents };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar agente por ID' })
  @ApiResponse({ status: 200, description: 'Agente encontrado.' })
  @ApiResponse({ status: 404, description: 'Agente não encontrado.' })
  async findOne(@Param('id') id: string, @User() user: any) {
    const agent = await this.agentsService.findOne(id, user.id);
    return { message: 'OK', statusCode: 200, data: agent };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar agente' })
  @ApiResponse({ status: 200, description: 'Agente atualizado.' })
  async update(
    @Param('id') id: string,
    @User() user: any,
    @Body() dto: UpdateAgentDto,
  ) {
    const agent = await this.agentsService.update(id, user.id, dto);
    return { message: 'Agente atualizado.', statusCode: 200, data: agent };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover agente' })
  @ApiResponse({ status: 200, description: 'Agente removido.' })
  async remove(@Param('id') id: string, @User() user: any) {
    await this.agentsService.remove(id, user.id);
    return { message: 'Agente removido.', statusCode: 200 };
  }

  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        contentText: { type: 'string', description: 'Texto extraído para conhecimento do agente' },
      },
    },
  })
  @ApiOperation({ summary: 'Adicionar arquivo de conhecimento ao agente' })
  async addFile(
    @Param('id') agentId: string,
    @User() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('contentText') contentText?: string,
  ) {
    if (!file && !contentText?.trim()) {
      throw new BadRequestException('Envie um arquivo ou o texto (contentText) para conhecimento.');
    }
    let fileUrl = 'text://inline';
    let fileName = 'texto-inline';
    if (file) {
      fileUrl = await this.storageService.uploadFile(file, 'agents');
      fileName = file.originalname || file.filename || fileName;
    }
    const agentFile = await this.agentsService.addFile(
      agentId,
      user.id,
      fileUrl,
      fileName,
      contentText,
    );
    return { message: 'Arquivo adicionado.', statusCode: 201, data: agentFile };
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Listar arquivos de conhecimento do agente' })
  async listFiles(@Param('id') agentId: string, @User() user: any) {
    const files = await this.agentsService.listFiles(agentId, user.id);
    return { message: 'OK', statusCode: 200, data: files };
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: 'Remover arquivo do agente' })
  async removeFile(
    @Param('id') agentId: string,
    @Param('fileId') fileId: string,
    @User() user: any,
  ) {
    await this.agentsService.removeFile(agentId, fileId, user.id);
    return { message: 'Arquivo removido.', statusCode: 200 };
  }
}
