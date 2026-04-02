import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DepartmentFile } from './entities/department-file.entity';
import { DepartmentFolder } from './entities/department-folder.entity';
import { Department } from '../departments/entities/departments.entiy';
import { Company } from '../companies/entities/companies.entity';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { CreateDepartmentFileDto } from './dtos/create-department-file.dto';
import { ListDepartmentFilesDto } from './dtos/list-department-files.dto';
import { CreateDepartmentFolderDto } from './dtos/create-department-folder.dto';
import { UpdateDepartmentFolderDto } from './dtos/update-department-folder.dto';

@Injectable()
export class DepartmentFilesService {
  private readonly logger = new Logger(DepartmentFilesService.name);

  constructor(
    @InjectRepository(DepartmentFile)
    private readonly departmentFileRepository: Repository<DepartmentFile>,
    @InjectRepository(DepartmentFolder)
    private readonly departmentFolderRepository: Repository<DepartmentFolder>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Verifica se o usuário é interno (tem rule administrator ou team)
   */
  private isInternalUser(user: User): boolean {
    if (user.isRootUser) {
      return false; // Cliente externo
    }

    return (
      user.userRoles?.some((userRole) =>
        userRole.role?.roleRules?.some(
          (roleRule) =>
            roleRule.rule?.rule === 'administrator' ||
            roleRule.rule?.rule === 'team',
        ),
      ) || false
    );
  }

  // ========== PASTAS ==========

  /**
   * Criar pasta em um departamento
   */
  async createFolder(
    createDto: CreateDepartmentFolderDto,
    currentUser: User,
  ): Promise<DepartmentFolder> {
    // Apenas usuários internos podem criar pastas
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem criar pastas.',
      );
    }

    // Verificar se o departamento existe
    const department = await this.departmentRepository.findOne({
      where: { id: createDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Departamento não encontrado.');
    }

    // Se fornecido companyId, verificar se o cliente existe
    let company: Company | null = null;
    if (createDto.companyId) {
      company = await this.companyRepository.findOne({
        where: { id: createDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Cliente não encontrado.');
      }
    }

    // Verificar se já existe pasta com o mesmo nome no departamento
    const existingFolder = await this.departmentFolderRepository.findOne({
      where: {
        name: createDto.name,
        department: { id: createDto.departmentId },
        company: company ? { id: company.id } : IsNull(),
        deletedAt: IsNull(),
      },
    });

    if (existingFolder) {
      throw new BadRequestException(
        'Já existe uma pasta com este nome neste departamento.',
      );
    }

    const folder = this.departmentFolderRepository.create({
      name: createDto.name,
      description: createDto.description,
      department,
      company,
      createdBy: currentUser,
    });

    return await this.departmentFolderRepository.save(folder);
  }

  /**
   * Listar pastas de um departamento
   */
  async listFolders(
    departmentId: string,
    currentUser: User,
  ): Promise<DepartmentFolder[]> {
    // Apenas usuários internos podem listar pastas
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem listar pastas.',
      );
    }

    return await this.departmentFolderRepository.find({
      where: {
        department: { id: departmentId },
        deletedAt: IsNull(),
      },
      relations: ['department', 'company', 'createdBy'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Obter pasta por ID
   */
  async getFolderById(
    folderId: string,
    currentUser: User,
  ): Promise<DepartmentFolder> {
    // Apenas usuários internos podem acessar pastas
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem acessar pastas.',
      );
    }

    const folder = await this.departmentFolderRepository.findOne({
      where: { id: folderId, deletedAt: IsNull() },
      relations: ['department', 'company', 'createdBy'],
    });

    if (!folder) {
      throw new NotFoundException('Pasta não encontrada.');
    }

    return folder;
  }

  /**
   * Atualizar pasta
   */
  async updateFolder(
    folderId: string,
    updateDto: UpdateDepartmentFolderDto,
    currentUser: User,
  ): Promise<DepartmentFolder> {
    // Apenas usuários internos podem atualizar pastas
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem atualizar pastas.',
      );
    }

    const folder = await this.getFolderById(folderId, currentUser);

    if (updateDto.name) {
      folder.name = updateDto.name;
    }

    if (updateDto.description !== undefined) {
      folder.description = updateDto.description;
    }

    return await this.departmentFolderRepository.save(folder);
  }

  /**
   * Deletar pasta (soft delete)
   */
  async deleteFolder(folderId: string, currentUser: User): Promise<void> {
    // Apenas usuários internos podem deletar pastas
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem deletar pastas.',
      );
    }

    await this.getFolderById(folderId, currentUser);
    await this.departmentFolderRepository.softDelete(folderId);
  }

  // ========== ARQUIVOS ==========

  /**
   * Upload de arquivo em pasta de departamento
   */
  async uploadFile(
    file: Express.Multer.File,
    createFileDto: CreateDepartmentFileDto,
    currentUser: User,
  ): Promise<DepartmentFile> {
    // Apenas usuários internos podem fazer upload
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem fazer upload de arquivos.',
      );
    }

    // Validar ano e mês
    const year = createFileDto.year;
    const month = createFileDto.month;

    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Ano inválido.');
    }

    if (month < 1 || month > 12) {
      throw new BadRequestException('Mês inválido (deve ser entre 1 e 12).');
    }

    // Verificar se a pasta existe
    const folder = await this.departmentFolderRepository.findOne({
      where: { id: createFileDto.folderId, deletedAt: IsNull() },
      relations: ['department', 'company'],
    });

    if (!folder) {
      throw new NotFoundException('Pasta não encontrada.');
    }

    // Criar estrutura hierárquica de pastas: department-files/{departmentId}/{folderId}/{year}/{month}
    const folderName = `department-files/${folder.department.id}/${folder.id}/${year}/${month}`;

    // Fazer upload para o storage
    const fileUrl = await this.storageService.uploadFile(file, folderName);

    // Extrair o path do storage
    let path = fileUrl;
    if (fileUrl.includes('/uploads/')) {
      path = fileUrl.split('/uploads/')[1];
    } else if (fileUrl.startsWith('/uploads/')) {
      path = fileUrl.substring(9);
    }

    const storageFilename = path.split('/').pop() || file.originalname;

    // Criar registro no banco
    const departmentFile = this.departmentFileRepository.create({
      filename: storageFilename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: fileUrl,
      path: path,
      folder: folder,
      year: year,
      month: month,
      uploadedBy: currentUser,
      description: createFileDto.description,
    });

    return await this.departmentFileRepository.save(departmentFile);
  }

  /**
   * Listar arquivos
   */
  async listFiles(
    listFilesDto: ListDepartmentFilesDto,
    currentUser: User,
  ): Promise<DepartmentFile[]> {
    // Apenas usuários internos podem listar arquivos
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem listar arquivos.',
      );
    }

    const queryBuilder = this.departmentFileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.folder', 'folder')
      .leftJoinAndSelect('folder.department', 'department')
      .leftJoinAndSelect('folder.company', 'company')
      .leftJoinAndSelect('file.uploadedBy', 'uploadedBy')
      .where('file.deletedAt IS NULL');

    if (listFilesDto.folderId) {
      queryBuilder.andWhere('folder.id = :folderId', {
        folderId: listFilesDto.folderId,
      });
    }

    if (listFilesDto.departmentId) {
      queryBuilder.andWhere('department.id = :departmentId', {
        departmentId: listFilesDto.departmentId,
      });
    }

    if (listFilesDto.year) {
      queryBuilder.andWhere('file.year = :year', { year: listFilesDto.year });
    }

    if (listFilesDto.month) {
      queryBuilder.andWhere('file.month = :month', {
        month: listFilesDto.month,
      });
    }

    queryBuilder.orderBy('file.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Obter arquivo por ID
   */
  async getFileById(
    fileId: string,
    currentUser: User,
  ): Promise<DepartmentFile> {
    // Apenas usuários internos podem acessar arquivos
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem acessar arquivos.',
      );
    }

    const file = await this.departmentFileRepository.findOne({
      where: { id: fileId, deletedAt: IsNull() },
      relations: ['folder', 'folder.department', 'folder.company', 'uploadedBy'],
    });

    if (!file) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    return file;
  }

  /**
   * Download de arquivo
   */
  async downloadFile(
    fileId: string,
    currentUser: User,
  ): Promise<{ file: Buffer; filename: string; mimeType: string }> {
    const file = await this.getFileById(fileId, currentUser);

    const fileBuffer = await this.storageService.downloadFile(file.url);

    return {
      file: fileBuffer,
      filename: file.originalName,
      mimeType: file.mimeType,
    };
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(fileId: string, currentUser: User): Promise<void> {
    // Apenas usuários internos podem deletar
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem deletar arquivos.',
      );
    }

    const file = await this.departmentFileRepository.findOne({
      where: { id: fileId, deletedAt: IsNull() },
    });

    if (!file) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    // Deletar do storage
    try {
      await this.storageService.deleteFile(file.filename);
    } catch (error) {
      this.logger.error('Erro ao deletar arquivo do storage:', error);
    }

    // Soft delete no banco
    await this.departmentFileRepository.softDelete(fileId);
  }

  /**
   * Obter estrutura de pastas e arquivos por departamento
   */
  async getFolderStructure(
    departmentId: string,
    currentUser: User,
  ): Promise<{
    departmentId: string;
    departmentName: string;
    folders: Array<{
      folderId: string;
      folderName: string;
      companyId?: string;
      companyName?: string;
      years: Array<{
        year: number;
        months: number[];
      }>;
    }>;
  }> {
    // Apenas usuários internos podem acessar
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem acessar esta estrutura.',
      );
    }

    // Verificar se o departamento existe
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException('Departamento não encontrado.');
    }

    // Buscar todas as pastas do departamento
    const folders = await this.departmentFolderRepository.find({
      where: {
        department: { id: departmentId },
        deletedAt: IsNull(),
      },
      relations: ['company'],
      order: {
        createdAt: 'DESC',
      },
    });

    // Para cada pasta, buscar arquivos e agrupar por ano/mês
    const foldersWithStructure = await Promise.all(
      folders.map(async (folder) => {
        const files = await this.departmentFileRepository.find({
          where: {
            folder: { id: folder.id },
            deletedAt: IsNull(),
          },
        });

        this.logger.debug(`Pasta ${folder.name} (${folder.id}): ${files.length} arquivo(s) encontrado(s)`);

        // Agrupar por ano e mês
        const yearsMap: Record<number, Set<number>> = {};
        files.forEach((file) => {
          if (!yearsMap[file.year]) {
            yearsMap[file.year] = new Set();
          }
          yearsMap[file.year].add(file.month);
        });

        const years = Object.entries(yearsMap)
          .map(([year, months]) => ({
            year: parseInt(year),
            months: Array.from(months).sort((a, b) => a - b),
          }))
          .sort((a, b) => b.year - a.year);

        return {
          folderId: folder.id,
          folderName: folder.name,
          companyId: folder.company?.id,
          companyName: folder.company?.name,
          years,
        };
      }),
    );

    return {
      departmentId: department.id,
      departmentName: department.name,
      folders: foldersWithStructure,
    };
  }
}
