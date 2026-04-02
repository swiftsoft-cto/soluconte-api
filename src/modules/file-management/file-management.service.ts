import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ClientFile } from './entities/client-file.entity';
import { ClientNotificationEmail } from './entities/client-notification-email.entity';
import { ClientNotificationWhatsApp } from './entities/client-notification-whatsapp.entity';
import { Company } from '../companies/entities/companies.entity';
import { Department } from '../departments/entities/departments.entiy';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateFileDto } from './dtos/create-file.dto';
import { ListFilesDto } from './dtos/list-files.dto';
import { CreateNotificationEmailDto } from './dtos/create-notification-email.dto';
import { UpdateNotificationEmailDto } from './dtos/update-notification-email.dto';
import { CreateNotificationWhatsAppDto } from './dtos/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsAppDto } from './dtos/update-notification-whatsapp.dto';

@Injectable()
export class FileManagementService {
  private readonly logger = new Logger(FileManagementService.name);

  constructor(
    @InjectRepository(ClientFile)
    private readonly fileRepository: Repository<ClientFile>,
    @InjectRepository(ClientNotificationEmail)
    private readonly notificationEmailRepository: Repository<ClientNotificationEmail>,
    @InjectRepository(ClientNotificationWhatsApp)
    private readonly notificationWhatsAppRepository: Repository<ClientNotificationWhatsApp>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly storageService: StorageService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsAppService: WhatsAppService,
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

  /**
   * Obtém a URL do frontend para login
   * Prioridade: FRONTEND_URL (variável de ambiente) > URL padrão (https://web.soluconte.com/login)
   */
  private getFrontendLoginUrl(): string {
    // Prioridade 1: Variável de ambiente FRONTEND_URL (permite override se necessário)
    if (process.env.FRONTEND_URL) {
      const url = process.env.FRONTEND_URL.trim();
      // Garante que termina com /login
      return url.endsWith('/login') ? url : `${url}/login`;
    }

    // URL padrão: https://web-homol.soluconte.com/login
    return 'https://web-homol.soluconte.com/login';
  }

  /**
   * Upload de arquivo (apenas usuários internos)
   */
  async uploadFile(
    file: Express.Multer.File,
    createFileDto: CreateFileDto,
    currentUser: User,
  ): Promise<ClientFile> {
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

    // Verificar se a empresa existe
    const company = await this.companyRepository.findOne({
      where: { id: createFileDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // Departamento opcional: validar se pertence à empresa
    let department: Department | null = null;
    if (createFileDto.departmentId) {
      department = await this.departmentRepository.findOne({
        where: { id: createFileDto.departmentId, company: { id: company.id } },
        relations: ['company'],
      });
      if (!department) {
        throw new BadRequestException(
          'Departamento não encontrado ou não pertence a este cliente.',
        );
      }
    }

    // Estrutura: client-files/{companyId}/{departmentId|geral}/{year}/{month}
    const departmentSegment = department ? department.id : 'geral';
    const folderName = `client-files/${company.id}/${departmentSegment}/${year}/${month}`;

    // Fazer upload para o storage
    const fileUrl = await this.storageService.uploadFile(file, folderName);

    // Extrair o path do storage (sem a URL base)
    let path = fileUrl;
    if (fileUrl.includes('/uploads/')) {
      path = fileUrl.split('/uploads/')[1];
    } else if (fileUrl.startsWith('/uploads/')) {
      path = fileUrl.substring(9); // Remove '/uploads/'
    }

    // Extrair o filename gerado pelo storage (última parte do path)
    const storageFilename = path.split('/').pop() || file.originalname;

    // Determinar se deve enviar para o cliente (padrão: true para manter compatibilidade)
    const sendToClient = createFileDto.sendToClient !== undefined ? createFileDto.sendToClient : true;

    // Criar registro no banco
    const clientFile = this.fileRepository.create({
      filename: storageFilename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: fileUrl,
      path: path,
      company: company,
      department: department,
      year: year,
      month: month,
      uploadedBy: currentUser,
      description: createFileDto.description,
      sendToClient: sendToClient,
    });

    const savedFile = await this.fileRepository.save(clientFile);

    if (sendToClient) {
      try {
        const fileWithDept = await this.fileRepository.findOne({
          where: { id: savedFile.id },
          relations: ['company', 'department'],
        });
        await this.sendDocumentNotifications(fileWithDept || savedFile, company);
      } catch (error) {
        this.logger.error('Erro ao enviar notificações de documento:', error);
        // Não falha o upload se o envio de notificações falhar
      }
    } else {
      this.logger.log(`Arquivo ${savedFile.id} salvo sem envio para o cliente (sendToClient=false)`);
    }

    return savedFile;
  }

  /**
   * Enviar notificações de novo documento para emails e WhatsApp configurados
   */
  private async sendDocumentNotifications(
    file: ClientFile,
    company: Company,
  ): Promise<void> {
    this.logger.log(`[WHATSAPP] Iniciando envio de notificações para empresa ${company.id} (${company.name || company.businessName})`);
    
    // Notificações do cliente que recebem este documento: Geral (department null) ou do mesmo departamento do arquivo
    const fileDepartmentId = file.department?.id ?? null;
    const [notificationEmails, notificationWhatsApps] = await Promise.all([
      this.notificationEmailRepository
        .createQueryBuilder('e')
        .where('e.company_id = :companyId', { companyId: company.id })
        .andWhere('e.deleted_at IS NULL')
        .andWhere('(e.department_id IS NULL OR e.department_id = :deptId)', { deptId: fileDepartmentId })
        .getMany(),
      this.notificationWhatsAppRepository
        .createQueryBuilder('w')
        .where('w.company_id = :companyId', { companyId: company.id })
        .andWhere('w.deleted_at IS NULL')
        .andWhere('(w.department_id IS NULL OR w.department_id = :deptId)', { deptId: fileDepartmentId })
        .getMany(),
    ]);

    this.logger.log(`[WHATSAPP] Encontrados ${notificationEmails.length} emails e ${notificationWhatsApps.length} WhatsApps para notificar`);

    if (notificationEmails.length === 0 && notificationWhatsApps.length === 0) {
      this.logger.log(`[WHATSAPP] Nenhum contato configurado para empresa ${company.id}`);
      return; // Nenhum contato configurado
    }

    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    const monthName = months[file.month - 1] || '';

    // URL de login - detecta dinamicamente baseado no ambiente
    const loginUrl = this.getFrontendLoginUrl();

    const companyName = company.businessName || company.name;

    // Preparar promessas de envio de emails
    const emailPromises = notificationEmails.map((notificationEmail) =>
      this.emailService.sendDocumentNotification({
        companyName,
        email: notificationEmail.email,
        fileName: file.originalName,
        year: file.year,
        month: monthName,
        loginUrl,
      }),
    );

    // Preparar promessas de envio de WhatsApp
    const whatsAppPromises = notificationWhatsApps.map(
      (notificationWhatsApp) => {
        this.logger.log(`[WHATSAPP] Preparando envio para ${notificationWhatsApp.phoneNumber} (empresa: ${companyName})`);
        return this.whatsAppService.sendDocumentNotification({
          companyName,
          phoneNumber: notificationWhatsApp.phoneNumber,
          fileName: file.originalName,
          year: file.year,
          month: monthName,
          loginUrl,
        }).then((result) => {
          this.logger.log(`[WHATSAPP] ✅ Mensagem enviada com sucesso para ${notificationWhatsApp.phoneNumber}. ID: ${result?.id?._serialized || result?.id || 'N/A'}`);
          return result;
        }).catch((error) => {
          // Log erro mas não interrompe outros envios
          this.logger.error(
            `[WHATSAPP] ❌ Erro ao enviar WhatsApp para ${notificationWhatsApp.phoneNumber}:`,
            {
              message: error?.message || 'N/A',
              error: error?.toString() || 'N/A',
              stack: error?.stack?.substring(0, 500) || 'N/A',
            },
          );
          throw error; // Re-throw para Promise.allSettled capturar
        });
      },
    );

    // Enviar todas as notificações em paralelo
    this.logger.log(`[WHATSAPP] Enviando ${whatsAppPromises.length} mensagens WhatsApp em paralelo...`);
    const results = await Promise.allSettled([...emailPromises, ...whatsAppPromises]);
    
    // Log dos resultados
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.logger.log(`[WHATSAPP] ✅ Notificação ${index + 1} enviada com sucesso`);
      } else {
        this.logger.error(`[WHATSAPP] ❌ Notificação ${index + 1} falhou:`, result.reason?.message || result.reason);
      }
    });
    
    this.logger.log(`[WHATSAPP] Processo de envio de notificações concluído`);
  }

  /**
   * Listar arquivos com filtros
   */
  async listFiles(
    listFilesDto: ListFilesDto,
    currentUser: User,
  ): Promise<ClientFile[]> {
    const isInternal = this.isInternalUser(currentUser);

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.company', 'company')
      .leftJoinAndSelect('file.department', 'department')
      .leftJoinAndSelect('file.uploadedBy', 'uploadedBy')
      .where('file.deletedAt IS NULL');

    // Se for cliente externo, só pode ver arquivos da sua própria empresa E que tenham sendToClient = true
    if (!isInternal) {
      if (!currentUser.selectedCompany) {
        throw new ForbiddenException(
          'Você não tem acesso a nenhuma empresa.',
        );
      }
      queryBuilder
        .andWhere('company.id = :companyId', {
          companyId: currentUser.selectedCompany.id,
        })
        .andWhere('file.sendToClient = :sendToClient', {
          sendToClient: true,
        });
    } else {
      // Se for interno e forneceu companyId, filtrar por empresa
      if (listFilesDto.companyId) {
        queryBuilder.andWhere('company.id = :companyId', {
          companyId: listFilesDto.companyId,
        });
      }
    }

    // Filtro por departamento: "geral" ou vazio = apenas arquivos sem departamento; UUID = arquivos daquele departamento
    if (listFilesDto.departmentId !== undefined && listFilesDto.departmentId !== null) {
      if (listFilesDto.departmentId === 'geral' || listFilesDto.departmentId === '') {
        queryBuilder.andWhere('file.department_id IS NULL');
      } else {
        queryBuilder.andWhere('file.department_id = :departmentId', {
          departmentId: listFilesDto.departmentId,
        });
      }
    }

    // Filtros opcionais
    if (listFilesDto.year) {
      queryBuilder.andWhere('file.year = :year', { year: listFilesDto.year });
    }

    if (listFilesDto.month) {
      queryBuilder.andWhere('file.month = :month', {
        month: listFilesDto.month,
      });
    }

    // Ordenar por data de criação (mais recentes primeiro)
    queryBuilder.orderBy('file.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Obter arquivo por ID
   */
  async getFileById(fileId: string, currentUser: User): Promise<ClientFile> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, deletedAt: IsNull() },
      relations: ['company', 'department', 'uploadedBy'],
    });

    if (!file) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    // Verificar permissão
    const isInternal = this.isInternalUser(currentUser);

    if (!isInternal) {
      // Cliente externo só pode ver arquivos da sua própria empresa
      if (
        !currentUser.selectedCompany ||
        file.company.id !== currentUser.selectedCompany.id
      ) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este arquivo.',
        );
      }
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

    // Fazer download do storage
    const fileBuffer = await this.storageService.downloadFile(file.url);

    return {
      file: fileBuffer,
      filename: file.originalName,
      mimeType: file.mimeType,
    };
  }

  /**
   * Deletar arquivo (apenas usuários internos)
   */
  async deleteFile(fileId: string, currentUser: User): Promise<void> {
    // Apenas usuários internos podem deletar
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem deletar arquivos.',
      );
    }

    const file = await this.fileRepository.findOne({
      where: { id: fileId, deletedAt: IsNull() },
    });

    if (!file) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    // Deletar do storage
    try {
      // O storage service precisa apenas do filename (não do path completo)
      // O storage busca o arquivo no metadata pelo filename e usa o folder salvo
      await this.storageService.deleteFile(file.filename);
    } catch (error) {
      console.error('Erro ao deletar arquivo do storage:', error);
      // Continua mesmo se falhar no storage (soft delete no banco)
    }

    // Soft delete no banco
    await this.fileRepository.softDelete(fileId);
  }

  /**
   * Enviar (ou reenviar) notificações de um arquivo específico para o cliente.
   * Útil quando o arquivo foi salvo com sendToClient = false e o usuário deseja
   * disparar a notificação posteriormente.
   */
  async sendFileToClient(
    fileId: string,
    currentUser: User,
  ): Promise<ClientFile> {
    // Apenas usuários internos podem enviar notificações de arquivos
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException(
        'Apenas usuários internos podem enviar arquivos para o cliente.',
      );
    }

    const file = await this.fileRepository.findOne({
      where: { id: fileId, deletedAt: IsNull() },
      relations: ['company', 'department'],
    });

    if (!file) {
      throw new NotFoundException('Arquivo não encontrado.');
    }

    if (!file.sendToClient) {
      file.sendToClient = true;
      await this.fileRepository.save(file);
    }

    try {
      await this.sendDocumentNotifications(file, file.company);
    } catch (error) {
      this.logger.error(
        'Erro ao enviar notificações de documento (envio manual):',
        error as any,
      );
      // Não falha a operação principal se o envio de notificações falhar
    }

    return file;
  }

  /**
   * Obter estrutura de pastas: Cliente → Departamento → Ano → Meses
   */
  async getFolderStructure(
    companyId?: string,
    currentUser?: User,
  ): Promise<
    | {
        companyId: string;
        companyName: string;
        departments: Array<{
          departmentId: string | null;
          departmentName: string;
          years: Array<{ year: number; months: number[] }>;
        }>;
      }
    | Array<{
        companyId: string;
        companyName: string;
        departments: Array<{
          departmentId: string | null;
          departmentName: string;
          years: Array<{ year: number; months: number[] }>;
        }>;
      }>
  > {
    const isInternal = currentUser ? this.isInternalUser(currentUser) : true;

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.company', 'company')
      .leftJoinAndSelect('file.department', 'department')
      .where('file.deletedAt IS NULL');

    // Se for cliente externo, só pode ver sua própria empresa E arquivos com sendToClient = true
    if (!isInternal && currentUser) {
      if (!currentUser.selectedCompany) {
        throw new ForbiddenException(
          'Você não tem acesso a nenhuma empresa.',
        );
      }
      queryBuilder
        .andWhere('company.id = :companyId', {
          companyId: currentUser.selectedCompany.id,
        })
        .andWhere('file.sendToClient = :sendToClient', {
          sendToClient: true,
        });
    } else {
      // Se for interno, filtrar apenas companies que são clientes (com rootUser)
      queryBuilder
        .innerJoin('company.users', 'rootUser')
        .andWhere('rootUser.isRootUser = :isRootUser', {
          isRootUser: true,
        })
        .distinct(true);

      if (companyId) {
        queryBuilder.andWhere('company.id = :companyId', {
          companyId: companyId,
        });
      }
    }

    const files = await queryBuilder.getMany();

    // Agrupar por empresa → departamento → ano → meses
    type DeptKey = string; // 'geral' | uuid
    const structure: Record<
      string,
      {
        companyName: string;
        departments: Record<
          DeptKey,
          { departmentId: string | null; departmentName: string; years: Record<number, Set<number>> }
        >;
      }
    > = {};

    files.forEach((file) => {
      const compId = file.company.id;
      const compName = file.company.name;
      const deptId = file.department?.id ?? null;
      const deptKey: DeptKey = deptId ?? 'geral';
      const deptName = file.department?.name ?? 'Geral';

      if (!structure[compId]) {
        structure[compId] = {
          companyName: compName,
          departments: {},
        };
      }

      if (!structure[compId].departments[deptKey]) {
        structure[compId].departments[deptKey] = {
          departmentId: deptId,
          departmentName: deptName,
          years: {},
        };
      }

      const dept = structure[compId].departments[deptKey];
      if (!dept.years[file.year]) {
        dept.years[file.year] = new Set();
      }
      dept.years[file.year].add(file.month);
    });

    const result = Object.entries(structure).map(([id, data]) => ({
      companyId: id,
      companyName: data.companyName,
      departments: Object.values(data.departments)
        .map((dept) => ({
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          years: Object.entries(dept.years)
            .map(([year, months]) => ({
              year: parseInt(year),
              months: Array.from(months).sort((a, b) => a - b),
            }))
            .sort((a, b) => b.year - a.year),
        }))
        .sort((a, b) => {
          // Geral primeiro, depois por nome
          if (a.departmentId === null) return -1;
          if (b.departmentId === null) return 1;
          return (a.departmentName || '').localeCompare(b.departmentName || '');
        }),
    }));

    if (companyId) {
      return (
        result.find((r) => r.companyId === companyId) || {
          companyId: companyId,
          companyName: '',
          departments: [],
        }
      );
    }

    return result;
  }

  /**
   * Listar emails de notificação de um cliente
   */
  async listNotificationEmails(
    companyId: string,
    currentUser: User,
  ): Promise<ClientNotificationEmail[]> {
    const isInternal = this.isInternalUser(currentUser);

    // Verificar permissão
    if (!isInternal) {
      // Cliente externo só pode ver emails da sua própria empresa
      if (!currentUser.selectedCompany || currentUser.selectedCompany.id !== companyId) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar estes emails.',
        );
      }
    }

    // Verificar se a empresa existe
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return await this.notificationEmailRepository.find({
      where: {
        company: { id: companyId },
        deletedAt: IsNull(),
      },
      relations: ['department'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Criar email de notificação
   */
  async createNotificationEmail(
    createDto: CreateNotificationEmailDto,
    currentUser: User,
  ): Promise<ClientNotificationEmail> {
    const isInternal = this.isInternalUser(currentUser);

    // Verificar permissão
    if (!isInternal) {
      // Cliente externo só pode criar emails para sua própria empresa
      if (
        !currentUser.selectedCompany ||
        currentUser.selectedCompany.id !== createDto.companyId
      ) {
        throw new ForbiddenException(
          'Você não tem permissão para criar emails para este cliente.',
        );
      }
    }

    // Verificar se a empresa existe
    const company = await this.companyRepository.findOne({
      where: { id: createDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    let department: Department | null = null;
    if (createDto.departmentId) {
      department = await this.departmentRepository.findOne({
        where: { id: createDto.departmentId },
      });
      if (!department) {
        throw new BadRequestException('Departamento não encontrado.');
      }
    }

    const existingCount = await this.notificationEmailRepository.count({
      where: {
        company: { id: createDto.companyId },
        deletedAt: IsNull(),
      },
    });
    if (existingCount >= 5) {
      throw new BadRequestException(
        'Limite de 5 emails por cliente atingido. Remova um email antes de adicionar outro.',
      );
    }

    const existingEmail = await this.notificationEmailRepository.findOne({
      where: department
        ? {
            email: createDto.email,
            company: { id: createDto.companyId },
            department: { id: department.id },
            deletedAt: IsNull(),
          }
        : {
            email: createDto.email,
            company: { id: createDto.companyId },
            department: IsNull(),
            deletedAt: IsNull(),
          },
    });
    if (existingEmail) {
      throw new BadRequestException('Este email já está configurado para este cliente e departamento.');
    }

    const notificationEmail = this.notificationEmailRepository.create({
      email: createDto.email,
      company: company,
      department: department,
    });

    return await this.notificationEmailRepository.save(notificationEmail);
  }

  /**
   * Atualizar email de notificação
   */
  async updateNotificationEmail(
    id: string,
    updateDto: UpdateNotificationEmailDto,
    currentUser: User,
  ): Promise<ClientNotificationEmail> {
    const notificationEmail = await this.notificationEmailRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['company', 'department'],
    });

    if (!notificationEmail) {
      throw new NotFoundException('Email de notificação não encontrado.');
    }

    const isInternal = this.isInternalUser(currentUser);
    if (!isInternal && (currentUser.selectedCompany?.id !== notificationEmail.company.id)) {
      throw new ForbiddenException('Você não tem permissão para atualizar este email.');
    }

    if (updateDto.email && updateDto.email !== notificationEmail.email) {
      const existingEmail = await this.notificationEmailRepository.findOne({
        where: {
          email: updateDto.email,
          company: { id: notificationEmail.company.id },
          deletedAt: IsNull(),
        },
      });
      if (existingEmail) {
        throw new BadRequestException('Este email já está configurado para este cliente.');
      }
      notificationEmail.email = updateDto.email;
    }

    if (updateDto.departmentId !== undefined) {
      notificationEmail.department = null;
      if (updateDto.departmentId) {
        const dept = await this.departmentRepository.findOne({ where: { id: updateDto.departmentId } });
        if (dept) notificationEmail.department = dept;
      }
    }

    return await this.notificationEmailRepository.save(notificationEmail);
  }

  /**
   * Deletar email de notificação
   */
  async deleteNotificationEmail(
    id: string,
    currentUser: User,
  ): Promise<void> {
    const notificationEmail = await this.notificationEmailRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['company'],
    });

    if (!notificationEmail) {
      throw new NotFoundException('Email de notificação não encontrado.');
    }

    const isInternal = this.isInternalUser(currentUser);

    // Verificar permissão
    if (!isInternal) {
      // Cliente externo só pode deletar emails da sua própria empresa
      if (
        !currentUser.selectedCompany ||
        currentUser.selectedCompany.id !== notificationEmail.company.id
      ) {
        throw new ForbiddenException(
          'Você não tem permissão para deletar este email.',
        );
      }
    }

    // Soft delete
    await this.notificationEmailRepository.softDelete(id);
  }

  // ========== Métodos de WhatsApp de Notificação ==========

  /**
   * Listar números WhatsApp de notificação de um cliente
   */
  async listNotificationWhatsApp(
    companyId: string,
    currentUser: User,
  ): Promise<ClientNotificationWhatsApp[]> {
    const isInternal = this.isInternalUser(currentUser);

    // Verificar permissão
    if (!isInternal) {
      // Cliente externo só pode ver números da sua própria empresa
      if (!currentUser.selectedCompany || currentUser.selectedCompany.id !== companyId) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar estes números.',
        );
      }
    }

    // Verificar se a empresa existe
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return await this.notificationWhatsAppRepository.find({
      where: {
        company: { id: companyId },
        deletedAt: IsNull(),
      },
      relations: ['department'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Criar número WhatsApp de notificação (por cliente e opcionalmente por departamento)
   */
  async createNotificationWhatsApp(
    createDto: CreateNotificationWhatsAppDto,
    currentUser: User,
  ): Promise<ClientNotificationWhatsApp> {
    const isInternal = this.isInternalUser(currentUser);

    // Verificar permissão
    if (!isInternal) {
      // Cliente externo só pode criar números para sua própria empresa
      if (
        !currentUser.selectedCompany ||
        currentUser.selectedCompany.id !== createDto.companyId
      ) {
        throw new ForbiddenException(
          'Você não tem permissão para criar números para este cliente.',
        );
      }
    }

    // Verificar se a empresa existe
    const company = await this.companyRepository.findOne({
      where: { id: createDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    let department: Department | null = null;
    if (createDto.departmentId) {
      department = await this.departmentRepository.findOne({
        where: { id: createDto.departmentId },
      });
      if (!department) {
        throw new BadRequestException('Departamento não encontrado.');
      }
    }

    const existingNumber = await this.notificationWhatsAppRepository.findOne({
      where: department
        ? {
            phoneNumber: createDto.phoneNumber,
            company: { id: createDto.companyId },
            department: { id: department.id },
            deletedAt: IsNull(),
          }
        : {
            phoneNumber: createDto.phoneNumber,
            company: { id: createDto.companyId },
            department: IsNull(),
            deletedAt: IsNull(),
          },
    });
    if (existingNumber) {
      throw new BadRequestException('Este grupo/número já está configurado para este cliente e departamento.');
    }

    const notificationWhatsApp = this.notificationWhatsAppRepository.create({
      phoneNumber: createDto.phoneNumber,
      company: company,
      department: department,
    });

    return await this.notificationWhatsAppRepository.save(notificationWhatsApp);
  }

  /**
   * Atualizar número WhatsApp de notificação
   */
  async updateNotificationWhatsApp(
    id: string,
    updateDto: UpdateNotificationWhatsAppDto,
    currentUser: User,
  ): Promise<ClientNotificationWhatsApp> {
    const notificationWhatsApp = await this.notificationWhatsAppRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['company', 'department'],
    });

    if (!notificationWhatsApp) {
      throw new NotFoundException('Número WhatsApp de notificação não encontrado.');
    }

    const isInternal = this.isInternalUser(currentUser);
    if (!isInternal && (currentUser.selectedCompany?.id !== notificationWhatsApp.company.id)) {
      throw new ForbiddenException('Você não tem permissão para atualizar este número.');
    }

    if (updateDto.phoneNumber && updateDto.phoneNumber !== notificationWhatsApp.phoneNumber) {
      const existingNumber = await this.notificationWhatsAppRepository.findOne({
        where: {
          phoneNumber: updateDto.phoneNumber,
          company: { id: notificationWhatsApp.company.id },
          deletedAt: IsNull(),
        },
      });
      if (existingNumber) {
        throw new BadRequestException('Este número já está configurado para este cliente.');
      }
      notificationWhatsApp.phoneNumber = updateDto.phoneNumber;
    }

    if (updateDto.departmentId !== undefined) {
      notificationWhatsApp.department = null;
      if (updateDto.departmentId) {
        const dept = await this.departmentRepository.findOne({ where: { id: updateDto.departmentId } });
        if (dept) notificationWhatsApp.department = dept;
      }
    }

    return await this.notificationWhatsAppRepository.save(notificationWhatsApp);
  }

  /**
   * Deletar número WhatsApp de notificação
   */
  async deleteNotificationWhatsApp(
    id: string,
    currentUser: User,
  ): Promise<void> {
    const notificationWhatsApp = await this.notificationWhatsAppRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['company'],
    });

    if (!notificationWhatsApp) {
      throw new NotFoundException('Número WhatsApp de notificação não encontrado.');
    }

    const isInternal = this.isInternalUser(currentUser);

    // Verificar permissão
    if (!isInternal) {
      // Cliente externo só pode deletar números da sua própria empresa
      if (
        !currentUser.selectedCompany ||
        currentUser.selectedCompany.id !== notificationWhatsApp.company.id
      ) {
        throw new ForbiddenException(
          'Você não tem permissão para deletar este número.',
        );
      }
    }

    // Soft delete
    await this.notificationWhatsAppRepository.softDelete(id);
  }

  /**
   * Listar destinos de comunicação (grupos WhatsApp configurados por cliente/departamento).
   * Opcionalmente filtrar por departmentId (Soluconte).
   */
  async getCommunicationTargets(
    departmentId: string | undefined,
    currentUser: User,
  ): Promise<{ groupId: string; companyName: string; departmentName: string }[]> {
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException('Apenas usuários internos podem acessar os destinos de comunicação.');
    }

    const queryBuilder = this.notificationWhatsAppRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.company', 'company')
      .leftJoinAndSelect('w.department', 'department')
      .where('w.deleted_at IS NULL');

    if (departmentId !== undefined && departmentId !== null) {
      if (departmentId === 'geral' || departmentId === '') {
        queryBuilder.andWhere('w.department_id IS NULL');
      } else {
        queryBuilder.andWhere('w.department_id = :departmentId', { departmentId });
      }
    }

    const list = await queryBuilder.getMany();
    return list.map((w) => ({
      groupId: w.phoneNumber,
      companyName: w.company?.name || w.company?.businessName || '—',
      departmentName: w.department?.name || 'Geral',
    }));
  }

  /**
   * Enviar mensagem de texto para os grupos WhatsApp (todos ou por departamento).
   */
  async sendCommunicationMessage(
    message: string,
    departmentId: string | undefined,
    currentUser: User,
  ): Promise<{ sent: number; failed: number; results: { groupId: string; success: boolean; error?: string }[] }> {
    if (!this.isInternalUser(currentUser)) {
      throw new ForbiddenException('Apenas usuários internos podem enviar mensagens de comunicação.');
    }

    const targets = await this.getCommunicationTargets(departmentId, currentUser);
    const uniqueGroupIds = [...new Set(targets.map((t) => t.groupId))];

    if (uniqueGroupIds.length === 0) {
      throw new BadRequestException(
        'Nenhum grupo configurado para o filtro selecionado. Configure notificações WhatsApp nos clientes.',
      );
    }

    const results: { groupId: string; success: boolean; error?: string }[] = [];
    let sent = 0;
    let failed = 0;

    for (const groupId of uniqueGroupIds) {
      try {
        await this.whatsAppService.sendMessage(groupId, message);
        results.push({ groupId, success: true });
        sent++;
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || 'Erro desconhecido';
        this.logger.warn(`[COMUNICAÇÃO] Falha ao enviar para ${groupId}: ${errorMessage}`);
        results.push({ groupId, success: false, error: errorMessage });
        failed++;
      }
    }

    return { sent, failed, results };
  }
}

