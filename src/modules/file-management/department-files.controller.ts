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
import { DepartmentFilesService } from './department-files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { Rule } from '../../common/decorators/rule.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../users/entities/user.entity';
import { CreateDepartmentFileDto } from './dtos/create-department-file.dto';
import { ListDepartmentFilesDto } from './dtos/list-department-files.dto';
import { CreateDepartmentFolderDto } from './dtos/create-department-folder.dto';
import { UpdateDepartmentFolderDto } from './dtos/update-department-folder.dto';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Department Files')
@Controller('api/department-files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentFilesController {
  constructor(
    private readonly departmentFilesService: DepartmentFilesService,
  ) {}

  // ========== PASTAS ==========

  @Post('folders')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @ApiOperation({ summary: 'Criar pasta em departamento (apenas usuários internos)' })
  async createFolder(
    @Body() createDto: CreateDepartmentFolderDto,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.createFolder(createDto, req.user);
  }

  @Get('folders/:departmentId')
  @ApiOperation({ summary: 'Listar pastas de um departamento' })
  async listFolders(
    @Param('departmentId') departmentId: string,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.listFolders(departmentId, req.user);
  }

  @Get('folders/detail/:folderId')
  @ApiOperation({ summary: 'Obter pasta por ID' })
  async getFolderById(
    @Param('folderId') folderId: string,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.getFolderById(folderId, req.user);
  }

  @Put('folders/:folderId')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @ApiOperation({ summary: 'Atualizar pasta' })
  async updateFolder(
    @Param('folderId') folderId: string,
    @Body() updateDto: UpdateDepartmentFolderDto,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.updateFolder(folderId, updateDto, req.user);
  }

  @Delete('folders/:folderId')
  @UseGuards(RulesGuard)
  @Rule('file-management.delete')
  @ApiOperation({ summary: 'Deletar pasta' })
  async deleteFolder(
    @Param('folderId') folderId: string,
    @Request() req: { user: User },
  ) {
    await this.departmentFilesService.deleteFolder(folderId, req.user);
    return { message: 'Pasta deletada com sucesso.' };
  }

  // ========== ARQUIVOS ==========

  @Post('upload')
  @UseGuards(RulesGuard)
  @Rule('file-management.upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de arquivo em pasta de departamento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folderId: { type: 'string' },
        year: { type: 'number' },
        month: { type: 'number' },
        description: { type: 'string' },
      },
      required: ['file', 'folderId', 'year', 'month'],
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: User },
    @Body('folderId') folderId: string,
    @Body('year', ParseIntPipe) year: number,
    @Body('month', ParseIntPipe) month: number,
    @Body('description') description?: string,
  ) {
    const createFileDto: CreateDepartmentFileDto = {
      folderId,
      year,
      month,
      description,
    };
    return this.departmentFilesService.uploadFile(
      file,
      createFileDto,
      req.user,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar arquivos de departamentos' })
  async listFiles(
    @Query() listFilesDto: ListDepartmentFilesDto,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.listFiles(listFilesDto, req.user);
  }

  @Get('structure/:departmentId')
  @ApiOperation({ summary: 'Obter estrutura de pastas e arquivos de um departamento' })
  async getFolderStructure(
    @Param('departmentId') departmentId: string,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.getFolderStructure(departmentId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter arquivo por ID' })
  async getFileById(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    return this.departmentFilesService.getFileById(id, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download de arquivo' })
  async downloadFile(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Res() res: Response,
  ) {
    const result = await this.departmentFilesService.downloadFile(id, req.user);

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
  @ApiOperation({ summary: 'Deletar arquivo' })
  async deleteFile(
    @Param('id') id: string,
    @Request() req: { user: User },
  ) {
    await this.departmentFilesService.deleteFile(id, req.user);
    return { message: 'Arquivo deletado com sucesso.' };
  }
}
