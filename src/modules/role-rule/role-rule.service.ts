import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from 'src/modules/roles/entities/roles.entities';
import { Rule } from 'src/modules/rules/entities.rules.entity';
import { RoleRule } from './entities/role-rule.entity';
import {
  RolePermissionDto,
  PermissionDto,
} from './dtos/role-rule-response.dto';
import { UpdateRolesDto } from './dtos/update-roles.dto';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class RoleRuleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Rule)
    private readonly ruleRepository: Repository<Rule>,

    @InjectRepository(RoleRule)
    private readonly roleRuleRepository: Repository<RoleRule>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Retorna a lista de Roles (e suas permissions) da empresa selecionada
   * pelo currentUser. Se o usuário não for "administrator" ou "team",
   * filtra as regras que não existirem no rootUser da empresa.
   */
  async getRoleRules(currentUser: any): Promise<RolePermissionDto[]> {
    // 1) Carrega as Roles da empresa do usuário
    const roles: Role[] = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'dep')
      .leftJoinAndSelect('dep.company', 'c')
      .leftJoinAndSelect('role.roleRules', 'rr')
      .leftJoinAndSelect('rr.rule', 'r')
      .where('c.id = :companyId', {
        companyId: currentUser.selectedCompany.id,
      })
      .getMany();

    // 2) Carrega todas as Rules do sistema
    const allRules = await this.ruleRepository.find();

    // 3) Agrupa as regras por categoria (prefixo antes do '.')
    // Filtra regras que não devem aparecer na listagem de permissões
    const excludedRules = [
      //'departments.paginate', // Visualizar departamentos paginados
      // 'departments.select', // Selecionar departamentos em formulários
      // 'users.select', // Selecionar usuários em formulários
      // 'roles.paginate', // Visualizar cargos paginados (opcional, mas pode ser necessário)
    ];

    const groupedRules: Record<string, PermissionDto> = allRules.reduce(
      (acc, ruleEntity) => {
        // Pula regras que não devem aparecer na listagem
        if (excludedRules.includes(ruleEntity.rule)) {
          return acc;
        }

        const [category] = ruleEntity.rule.split('.');
        if (!acc[category]) {
          acc[category] = {
            label: this.getPermissionLabel(category),
            rules: [],
          };
        }
        acc[category].rules.push({
          id: ruleEntity.id,
          description: ruleEntity.name,
          rule: ruleEntity.rule,
          active: false,
          createdAt: ruleEntity.createdAt,
          updatedAt: ruleEntity.updatedAt,
        } as any);
        return acc;
      },
      {} as Record<string, PermissionDto>,
    );

    // 4) Monta o array final (RolePermissionDto) para cada Role
    const result: RolePermissionDto[] = roles.map((role) => {
      // Clona toda a estrutura agrupada
      const rolePermissions: Record<string, PermissionDto> = JSON.parse(
        JSON.stringify(groupedRules),
      );

      // Marca as regras que a Role possui como "active"
      role.roleRules.forEach((rr) => {
        if (rr.rule) {
          const [category] = rr.rule.rule.split('.');
          const ruleEntry = rolePermissions[category]?.rules.find(
            (x) => x.id === rr.rule.id,
          );
          if (ruleEntry) {
            ruleEntry.active = true;
          }
        }
      });

      // Se a role não tiver a rule "administrator", removemos a categoria
      if (!role.roleRules.some((rr) => rr.rule?.rule === 'administrator')) {
        delete rolePermissions.administrator;
      }

      return {
        id: role.id,
        name: role.name,
        permissions: rolePermissions,
      };
    });

    // 5) Se o usuário NÃO tiver as rules "administrator" ou "team",
    //    filtra as rules com base no rootUser desta empresa
    const hasTeamOrAdministrator = this.userHasOneOfRules(currentUser, [
      'administrator',
      'team',
    ]);

    if (!hasTeamOrAdministrator) {
      // Localiza o rootUser através do encadeamento user->userRoles->roles->roleDepartments->departments->company
      const rootUser = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.userRoles', 'ur')
        .leftJoinAndSelect('ur.role', 'role')
        .leftJoinAndSelect('role.roleRules', 'roleRulePivot')
        .leftJoinAndSelect('roleRulePivot.rule', 'rootRules')
        .leftJoin('role.roleDepartments', 'rd')
        .leftJoin('rd.department', 'd')
        .leftJoin('d.company', 'comp')
        .where('comp.id = :companyId', {
          companyId: currentUser.selectedCompany.id,
        })
        .andWhere('u.isRootUser = :isRoot', { isRoot: true })
        .getOne();

      if (!rootUser) {
        // Se não encontrar root user, retorne vazio ou defina outra lógica
        return [];
      }

      // Monta um set com as rules do rootUser
      const rootUserRules = new Set<string>();
      for (const userRole of rootUser.userRoles ?? []) {
        const role = userRole.role;
        if (!role) continue;
        for (const pivot of role.roleRules ?? []) {
          if (pivot.rule?.rule) {
            rootUserRules.add(pivot.rule.rule);
          }
        }
      }

      // Filtra o array `result`, removendo as regras que não estejam no rootUserRules
      for (const roleItem of result) {
        for (const category of Object.keys(roleItem.permissions)) {
          roleItem.permissions[category].rules = roleItem.permissions[
            category
          ].rules.filter((r) => rootUserRules.has(r.rule));
        }
      }
    }

    // 6) Remove as categorias que estejam vazias (sem nenhuma rule no array)
    for (const roleItem of result) {
      for (const category of Object.keys(roleItem.permissions)) {
        if (roleItem.permissions[category].rules.length === 0) {
          delete roleItem.permissions[category];
        }
      }
    }

    return result;
  }

  /**
   * Atualização em massa das permissões de várias Roles.
   * (Mantém a mesma lógica que você já tinha.)
   */
  async updateRoleRulesBulk(
    dto: UpdateRolesDto,
    currentUser: any,
  ): Promise<{
    updated: RolePermissionDto[];
    warnings: string[]; // avisos de quais cargos não puderam ser alterados
  }> {
    // 1) Obter as roles do usuário logado
    const userWithRoles = await this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.userRoles', 'ur')
      .leftJoinAndSelect('ur.role', 'usrRole')
      .where('u.id = :userId', { userId: currentUser.id })
      .getOne();

    const userRoleIds = new Set<string>();
    userWithRoles?.userRoles?.forEach((pivot) => {
      if (pivot.role?.id) {
        userRoleIds.add(pivot.role.id);
      }
    });

    // Para armazenar mensagens de aviso quando ignorarmos alterações
    const warnings: string[] = [];

    // 2) Percorre cada cargo (Role) a ser atualizado
    for (const roleData of dto.items) {
      // 2a) Carrega a Role específica
      const role = await this.roleRepository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.roleDepartments', 'rd')
        .leftJoinAndSelect('rd.department', 'd')
        .leftJoinAndSelect('d.company', 'c')
        .leftJoinAndSelect('role.roleRules', 'rr')
        .leftJoinAndSelect('rr.rule', 'r')
        .where('role.id = :roleId', { roleId: roleData.id })
        .getOne();

      if (!role) {
        throw new NotFoundException(`Cargo ${roleData.id} não encontrado`);
      }

      // 2b) Verifica se a Role pertence à mesma company do usuário
      const belongsToCompany = role.roleDepartments?.some(
        (rd) => rd.department?.company?.id === currentUser.selectedCompany.id,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar este cargo',
        );
      }

      // 2c) Se for o mesmo cargo do usuário logado, ignorar alterações
      if (userRoleIds.has(role.id)) {
        // Adiciona um aviso
        warnings.push(
          `As alterações no cargo "${role.name}" (id=${role.id}) foram ignoradas, pois é o seu próprio cargo. Contate o Administrador do sistema.`,
        );
        // pula para o próximo cargo sem aplicar nada
        continue;
      }

      // 2d) Se chegou aqui, não é o próprio cargo => pode alterar
      for (const category in roleData.permissions) {
        const permission = roleData.permissions[category];
        for (const ruleData of permission.rules) {
          // Verifica se já existe a relação
          const existing = await this.roleRuleRepository.findOne({
            where: {
              role: { id: roleData.id },
              rule: { id: ruleData.id },
            },
          });

          // ========== ADICIONANDO A RULE ==========
          if (ruleData.active && !existing) {
            const newRR = this.roleRuleRepository.create({
              role: { id: roleData.id },
              rule: { id: ruleData.id },
            });
            await this.roleRuleRepository.save(newRR);

            // LOG de adição
            console.log(
              `Usuário "${currentUser.email}" adicionou a permissão "${ruleData.id}" (rule="${(ruleData as any).rule}") ao cargo "${role.name}" (${role.id}).`,
            );
          }
          // ========== REMOVENDO A RULE ==========
          else if (!ruleData.active && existing) {
            await this.roleRuleRepository.remove(existing);

            // LOG de remoção
            console.log(
              `Usuário "${currentUser.email}" removeu a permissão "${ruleData.id}" (rule="${(ruleData as any).rule}") do cargo "${role.name}" (${role.id}).`,
            );
          }
        }
      }
    }

    // 3) Retorna a lista atualizada + eventuais avisos
    const updatedPermissions = await this.getRoleRules(currentUser);
    return {
      updated: updatedPermissions,
      warnings,
    };
  }

  /**
   * Função auxiliar para exibir labels em PT-BR conforme a categoria
   */
  private getPermissionLabel(category: string): string {
    const mapping = {
      users: 'Usuários',
      company: 'Empresas',
      departments: 'Setores',
      roles: 'Cargos',
      rules: 'Permissões',
      'role-rule': 'Permissões',
      system: 'Sistema',
      administrator: 'Administrador',
      team: 'Equipe',
      services: 'Serviços',
      'company-services': 'Serviços Contratados',
      'internal-tasks': 'Projetos',
      'password-vault': 'Banco de Senhas',
      checklists: 'Checklists',
      customers: 'Clientes',
      'crm-companies': 'Empresas CRM',
      'crm-contacts': 'Contatos CRM',
      'crm-teams': 'Times CRM',
      'crm-funnels': 'Funis CRM',
      'crm-stages': 'Estágios CRM',
      'crm-negotiations': 'Negociações CRM',
      'crm-tasks': 'Tarefas CRM',
      'crm-dashboard': 'Dashboard CRM',
    };
    return mapping[category] || category;
  }

  /**
   * Verifica se o usuário atual possui pelo menos uma das rules passadas.
   * Ajuste conforme onde as rules do usuário realmente ficam (ex: currentUser.rules).
   */
  private userHasOneOfRules(currentUser: any, rulesToCheck: string[]): boolean {
    if (!currentUser?.rules) {
      return false;
    }
    // Se "currentUser.rules" é um array de Rule, faça:
    return currentUser.rules.some((ruleEntity: Rule) =>
      rulesToCheck.includes(ruleEntity.rule),
    );
  }

  /**
   * Vínculo de uma única rule à uma Role
   */
  async linkRuleToRole(roleId: string, ruleId: string): Promise<string> {
    // Busca a role
    const role = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'd')
      .leftJoinAndSelect('d.company', 'c')
      .where('role.id = :roleId', { roleId })
      .getOne();

    if (!role) {
      throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
    }

    // Busca a rule
    const rule = await this.ruleRepository.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Rule com ID ${ruleId} não encontrada.`);
    }

    // Verifica se já existe
    const existing = await this.roleRuleRepository.findOne({
      where: {
        role: { id: roleId },
        rule: { id: ruleId },
      },
    });
    if (existing) {
      throw new BadRequestException('A rule já está vinculada a esta role.');
    }

    // Cria a associação
    const newRoleRule = this.roleRuleRepository.create({
      role: { id: roleId },
      rule: { id: ruleId },
    });
    await this.roleRuleRepository.save(newRoleRule);

    return `Rule com ID ${ruleId} vinculada à Role com ID ${roleId} com sucesso.`;
  }
}
