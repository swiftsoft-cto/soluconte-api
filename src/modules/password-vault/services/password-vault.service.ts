import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordVault } from '../entities/password-vault.entity';
import { PasswordEntry } from '../entities/password-entry.entity';
import { PasswordAccessLog } from '../entities/password-access-log.entity';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/companies.entity';
import { CreatePasswordVaultDto } from '../dtos/create-password-vault.dto';
import { PasswordVaultResponseDto } from '../dtos/password-vault-response.dto';
import { UpdatePasswordVaultDto } from '../dtos/update-password-vault.dto';

@Injectable()
export class PasswordVaultService {
  constructor(
    @InjectRepository(PasswordVault)
    private vaultRepository: Repository<PasswordVault>,
    @InjectRepository(PasswordEntry)
    private entryRepository: Repository<PasswordEntry>,
    @InjectRepository(PasswordAccessLog)
    private accessLogRepository: Repository<PasswordAccessLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async createVault(
    createVaultDto: CreatePasswordVaultDto,
    currentUser: User,
  ): Promise<PasswordVaultResponseDto> {
    // Verificar se já existe pasta para o cliente
    const existingVault = await this.vaultRepository.findOne({
      where: { companyId: createVaultDto.companyId },
    });

    if (existingVault) {
      throw new BadRequestException('Já existe uma pasta de senhas para este cliente');
    }

    // Verificar se o cliente existe
    const company = await this.companyRepository.findOne({
      where: { id: createVaultDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const vault = this.vaultRepository.create({
      ...createVaultDto,
      company: company,
      createdBy: currentUser,
    });

    const savedVault = await this.vaultRepository.save(vault);

    // Recarregar o vault com as relações para garantir que tudo esteja disponível
    const vaultWithRelations = await this.vaultRepository.findOne({
      where: { id: savedVault.id },
      relations: ['company', 'createdBy', 'entries'],
    });

    return this.formatVaultResponse(vaultWithRelations);
  }

  async findUserVaults(currentUser: User): Promise<PasswordVaultResponseDto[]> {
    const queryBuilder = this.vaultRepository
      .createQueryBuilder('vault')
      .leftJoinAndSelect('vault.company', 'company')
      .leftJoinAndSelect('vault.createdBy', 'createdBy')
      .leftJoinAndSelect('vault.entries', 'entries')
      .where('vault.isActive = :isActive', { isActive: true });

    // Aplicar filtros de permissão
    await this.applyVaultPermissionFilters(queryBuilder, currentUser);

    const vaults = await queryBuilder.getMany();

    return Promise.all(vaults.map(vault => this.formatVaultResponse(vault)));
  }

  async findOne(id: string, currentUser: User): Promise<PasswordVaultResponseDto> {
    const vault = await this.vaultRepository.findOne({
      where: { id },
      relations: ['company', 'createdBy', 'entries'],
    });

    if (!vault) {
      throw new NotFoundException('Pasta de senhas não encontrada');
    }

    // Verificar permissão
    await this.checkVaultPermission(vault, currentUser);

    return this.formatVaultResponse(vault);
  }

  async deleteVault(id: string, currentUser: User): Promise<void> {
    const vault = await this.vaultRepository.findOne({
      where: { id },
      relations: ['company', 'createdBy', 'entries', 'entries.accessLogs'],
    });

    if (!vault) {
      throw new NotFoundException('Pasta de senhas não encontrada');
    }

    // Verificar permissão
    await this.checkVaultPermission(vault, currentUser);

    // Verificar se é o criador ou administrador
    const isAdmin = this.isAdmin(currentUser);
    const isCreator = vault.createdById === currentUser.id;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Apenas o criador ou administradores podem excluir a pasta');
    }

    // Deletar em cascata: logs → entries → vault
    if (vault.entries && vault.entries.length > 0) {
      // Primeiro deletar todos os logs de acesso
      for (const entry of vault.entries) {
        if (entry.accessLogs && entry.accessLogs.length > 0) {
          await this.accessLogRepository.remove(entry.accessLogs);
        }
      }
      // Depois deletar as entries
      await this.entryRepository.remove(vault.entries);
    }

    // Por fim deletar o vault
    await this.vaultRepository.remove(vault);
  }

  async updateVault(
    id: string,
    data: UpdatePasswordVaultDto,
    currentUser: User,
  ): Promise<PasswordVaultResponseDto> {
    const vault = await this.vaultRepository.findOne({
      where: { id },
      relations: ['company', 'createdBy', 'entries'],
    });

    if (!vault) {
      throw new NotFoundException('Pasta de senhas não encontrada');
    }

    // Permissão: administrador ou criador
    const isAdmin = this.isAdmin(currentUser);
    const isCreator = vault.createdById === currentUser.id;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Apenas o criador ou administradores podem editar a pasta');
    }

    // Atualiza apenas campos permitidos
    if (typeof data.name === 'string' && data.name.trim()) {
      vault.name = data.name.trim();
    }
    if (typeof data.description === 'string') {
      vault.description = data.description;
    }

    const saved = await this.vaultRepository.save(vault);
    return this.formatVaultResponse(saved);
  }

  private async applyVaultPermissionFilters(queryBuilder: any, currentUser: User): Promise<void> {
    const isAdmin = this.isAdmin(currentUser);
    
    if (isAdmin) {
      return; // Admin vê tudo
    }

    // Regra: usuário com permissão pode ver
    // - pastas de clientes da sua carteira
    // - e SEMPRE as pastas que ele criou
    const userCompanyIds = await this.getUserCompanyIds(currentUser);

    if (userCompanyIds.length > 0) {
      queryBuilder.andWhere(
        '(company.id IN (:...userCompanyIds) OR vault.createdById = :creatorId)',
        { userCompanyIds, creatorId: currentUser.id },
      );
    } else {
      queryBuilder.andWhere('vault.createdById = :creatorId', {
        creatorId: currentUser.id,
      });
    }
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

  private isAdmin(currentUser: User): boolean {
    return currentUser.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some(
        (roleRule) => roleRule.rule?.rule === 'administrator',
      ),
    ) || false;
  }

  private async getUserCompanyIds(currentUser: User): Promise<string[]> {
    // Busca o usuário com seus papéis e departamentos para identificar
    // as empresas às quais ele está associado via departamentos/roles.
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.roleDepartments',
        'userRoles.role.roleDepartments.department',
        'userRoles.role.roleDepartments.department.company',
        'selectedCompany',
      ],
    });

    if (!user) return [];

    const companyIds = new Set<string>();

    // Empresa selecionada do usuário (se houver)
    if (user.selectedCompany?.id) {
      companyIds.add(user.selectedCompany.id);
    }

    // Empresas vindas dos departamentos associados aos roles do usuário
    for (const ur of user.userRoles || []) {
      const role = ur.role;
      for (const rd of role?.roleDepartments || []) {
        const deptCompanyId = rd.department?.company?.id;
        if (deptCompanyId) companyIds.add(deptCompanyId);
      }
    }

    return Array.from(companyIds);
  }

  private async formatVaultResponse(vault: PasswordVault): Promise<PasswordVaultResponseDto> {
    return {
      id: vault.id,
      name: vault.name,
      description: vault.description,
      company: {
        id: vault.company?.id || '',
        name: vault.company?.name || 'Cliente não encontrado',
      },
      createdBy: {
        id: vault.createdBy?.id || '',
        name: vault.createdBy?.name || 'Usuário não encontrado',
        email: vault.createdBy?.email || '',
      },
      entriesCount: vault.entries?.length || 0,
      isActive: vault.isActive,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    };
  }
}
