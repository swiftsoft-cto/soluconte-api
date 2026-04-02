import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordEntry } from '../entities/password-entry.entity';
import { PasswordVault } from '../entities/password-vault.entity';
import { PasswordAccessLog, PasswordAccessAction } from '../entities/password-access-log.entity';
import { User } from '../../users/entities/user.entity';
import { CreatePasswordEntryDto } from '../dtos/create-password-entry.dto';
import { UpdatePasswordEntryDto } from '../dtos/update-password-entry.dto';
import { PasswordEntryResponseDto, PasswordAccessLogResponseDto } from '../dtos/password-vault-response.dto';
import { EncryptionService } from './encryption.service';

@Injectable()
export class PasswordEntryService {
  constructor(
    @InjectRepository(PasswordEntry)
    private entryRepository: Repository<PasswordEntry>,
    @InjectRepository(PasswordVault)
    private vaultRepository: Repository<PasswordVault>,
    @InjectRepository(PasswordAccessLog)
    private accessLogRepository: Repository<PasswordAccessLog>,
    private encryptionService: EncryptionService,
  ) {}

  async createEntry(
    createEntryDto: CreatePasswordEntryDto,
    currentUser: User,
  ): Promise<PasswordEntryResponseDto> {
    // Verificar se a pasta existe e se o usuário tem permissão
    const vault = await this.vaultRepository.findOne({
      where: { id: createEntryDto.vaultId },
      relations: ['company'],
    });

    if (!vault) {
      throw new NotFoundException('Pasta de senhas não encontrada');
    }

    // Verificar permissão na pasta
    await this.checkVaultPermission(vault, currentUser);

    const encryptedPassword = this.encryptionService.encrypt(createEntryDto.password);

    const entry = this.entryRepository.create({
      ...createEntryDto,
      encryptedPassword,
      vault: vault,
      createdBy: currentUser,
    });

    const savedEntry = await this.entryRepository.save(entry);

    // Log de auditoria
    await this.logAccess(savedEntry.id, currentUser, PasswordAccessAction.CREATE);

    // Recarregar a entrada com as relações para garantir que tudo esteja disponível
    const entryWithRelations = await this.entryRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['vault', 'vault.company', 'createdBy'],
    });

    return this.formatEntryResponse(entryWithRelations);
  }

  async findVaultEntries(vaultId: string, currentUser: User): Promise<PasswordEntryResponseDto[]> {
    // Verificar se a pasta existe e se o usuário tem permissão
    const vault = await this.vaultRepository.findOne({
      where: { id: vaultId },
      relations: ['company'],
    });

    if (!vault) {
      throw new NotFoundException('Pasta de senhas não encontrada');
    }

    // Verificar permissão na pasta
    await this.checkVaultPermission(vault, currentUser);

    const entries = await this.entryRepository.find({
      where: { vaultId },
      relations: ['vault', 'vault.company', 'createdBy'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(entries.map(entry => this.formatEntryResponse(entry)));
  }

  async viewPassword(
    entryId: string,
    currentUser: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ password: string }> {
    const entry = await this.entryRepository.findOne({
      where: { id: entryId },
      relations: ['vault', 'vault.company'],
    });

    if (!entry) {
      throw new NotFoundException('Credencial não encontrada');
    }

    // Verificar permissões
    await this.checkEntryPermission(entry, currentUser);

    // Log de auditoria
    await this.logAccess(entryId, currentUser, PasswordAccessAction.VIEW, ipAddress, userAgent);

    const decryptedPassword = this.encryptionService.decrypt(entry.encryptedPassword);

    return { password: decryptedPassword };
  }

  async updateEntry(
    id: string,
    updateEntryDto: UpdatePasswordEntryDto,
    currentUser: User,
  ): Promise<PasswordEntryResponseDto> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['vault', 'vault.company'],
    });

    if (!entry) {
      throw new NotFoundException('Credencial não encontrada');
    }

    // Verificar permissões
    await this.checkEntryPermission(entry, currentUser);

    // Verificar se é o criador ou administrador
    const isAdmin = this.isAdmin(currentUser);
    const isCreator = entry.createdById === currentUser.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Apenas o criador ou administradores podem editar esta credencial');
    }

    // Criptografar nova senha se fornecida
    if (updateEntryDto.password) {
      updateEntryDto.encryptedPassword = this.encryptionService.encrypt(updateEntryDto.password);
      delete updateEntryDto.password;
    }

    Object.assign(entry, updateEntryDto);
    const savedEntry = await this.entryRepository.save(entry);

    // Log de auditoria
    await this.logAccess(id, currentUser, PasswordAccessAction.EDIT);

    return this.formatEntryResponse(savedEntry);
  }

  async deleteEntry(id: string, currentUser: User): Promise<void> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['vault', 'vault.company'],
    });

    if (!entry) {
      throw new NotFoundException('Credencial não encontrada');
    }

    // Verificar permissões
    await this.checkEntryPermission(entry, currentUser);

    // Verificar se é o criador ou administrador
    const isAdmin = this.isAdmin(currentUser);
    const isCreator = entry.createdById === currentUser.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Apenas o criador ou administradores podem excluir esta credencial');
    }

    // Log de auditoria ANTES de deletar (para registrar a ação)
    await this.logAccess(id, currentUser, PasswordAccessAction.DELETE);

    // Deletar primeiro todos os logs de acesso relacionados para evitar constraint de foreign key
    await this.accessLogRepository.delete({ entryId: id });

    // Agora pode deletar a entrada com segurança
    await this.entryRepository.remove(entry);
  }

  async getAccessLogs(entryId: string, currentUser: User): Promise<PasswordAccessLogResponseDto[]> {
    const entry = await this.entryRepository.findOne({
      where: { id: entryId },
      relations: ['vault', 'vault.company'],
    });

    if (!entry) {
      throw new NotFoundException('Credencial não encontrada');
    }

    // Verificar permissões
    await this.checkEntryPermission(entry, currentUser);

    const logs = await this.accessLogRepository.find({
      where: { entryId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50, // Limitar a 50 logs mais recentes
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
      },
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }));
  }

  private async checkVaultPermission(vault: PasswordVault, currentUser: User): Promise<void> {
    const isAdmin = this.isAdmin(currentUser);
    
    if (isAdmin) {
      return;
    }

    // Verificar se usuário tem acesso ao cliente
    const userCompanyIds = await this.getUserCompanyIds(currentUser);
    if (!userCompanyIds.includes(vault.companyId)) {
      throw new ForbiddenException('Acesso negado: cliente não está na sua carteira');
    }
  }

  private async checkEntryPermission(entry: PasswordEntry, currentUser: User): Promise<void> {
    const isAdmin = this.isAdmin(currentUser);
    
    if (isAdmin) {
      return;
    }

    // Verificar se é credencial restrita
    if (entry.isRestricted) {
      const isManager = this.isManager(currentUser);
      if (!isManager) {
        throw new ForbiddenException('Acesso negado: credencial restrita apenas para gestores');
      }
    }

    // Verificar se usuário tem acesso ao cliente
    const userCompanyIds = await this.getUserCompanyIds(currentUser);
    if (!userCompanyIds.includes(entry.vault.companyId)) {
      throw new ForbiddenException('Acesso negado: cliente não está na sua carteira');
    }
  }

  private async logAccess(
    entryId: string,
    user: User,
    action: PasswordAccessAction,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const log = this.accessLogRepository.create({
      entryId,
      userId: user.id,
      action,
      ipAddress,
      userAgent,
    });

    await this.accessLogRepository.save(log);
  }

  private isAdmin(currentUser: User): boolean {
    return currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    ) || false;
  }

  private isManager(currentUser: User): boolean {
    return currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'department-manager',
      ),
    ) || false;
  }

  private async getUserCompanyIds(currentUser: User): Promise<string[]> {
    // Implementar lógica para obter IDs dos clientes da carteira do usuário
    // Por enquanto, retornar array vazio - implementar conforme regras de negócio
    return [];
  }

  private async formatEntryResponse(entry: PasswordEntry): Promise<PasswordEntryResponseDto> {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      username: entry.username,
      url: entry.url,
      notes: entry.notes,
      isRestricted: entry.isRestricted,
      vault: {
        id: entry.vault?.id || '',
        name: entry.vault?.name || 'Pasta não encontrada',
        company: {
          id: entry.vault?.company?.id || '',
          name: entry.vault?.company?.name || 'Cliente não encontrado',
        },
      },
      createdBy: {
        id: entry.createdBy?.id || '',
        name: entry.createdBy?.name || 'Usuário não encontrado',
        email: entry.createdBy?.email || '',
      },
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
