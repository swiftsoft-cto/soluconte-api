// src/modules/roles/roles.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/roles.entities';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { RoleDepartment } from 'src/modules/role-department/entities/role-department.entity';
import { Department } from '../departments/entities/departments.entiy';
import { RoleHierarchy } from '../role-hierarchy/entities/role-hierarchy.entity';
import { RoleRuleService } from '../role-rule/role-rule.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(RoleDepartment)
    private readonly roleDepartmentRepository: Repository<RoleDepartment>,

    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,

    @InjectRepository(RoleHierarchy)
    private readonly roleHierarchyRepository: Repository<RoleHierarchy>,

    private readonly roleRuleService: RoleRuleService,
  ) {}

  async getOrganizationChart(currentUser: any): Promise<any> {
    if (!currentUser.selectedCompany) {
      throw new ForbiddenException('Usuário não possui empresa selecionada.');
    }
    const companyId = currentUser.selectedCompany.id;

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'dep')
      .leftJoinAndSelect('dep.company', 'comp')
      .leftJoinAndSelect('role.parentRoles', 'parentHierarchy')
      .leftJoinAndSelect('parentHierarchy.childRole', 'childRole')
      .leftJoinAndSelect('role.childRoles', 'childHierarchy')
      .leftJoinAndSelect('childHierarchy.parentRole', 'parentRole')
      .where('comp.id = :companyId', { companyId })
      .andWhere('role.deleted_at IS NULL')
      .getMany();

    if (!roles.length) {
      throw new NotFoundException('Nenhuma Role encontrada para esta empresa.');
    }

    const roleMap = new Map<string, any>();
    roles.forEach((role) => {
      roleMap.set(role.id, {
        role: role.name,
        departments: (role.roleDepartments || []).map((rd: any) => ({
          id: rd.department.id,
          name: rd.department.name,
        })),
        children: [], // Inicialmente vazio
      });
    });

    // Constrói a hierarquia: para cada role pai, adiciona os filhos
    roles.forEach((role) => {
      if (role.parentRoles && role.parentRoles.length > 0) {
        role.parentRoles.forEach((rel: any) => {
          const child = rel.childRole;
          if (child && roleMap.has(child.id)) {
            roleMap.get(role.id).children.push(roleMap.get(child.id));
          }
        });
      }
    });

    // Identifica as roles raiz (não são filhas de nenhuma outra role)
    const rootRoles = roles
      .filter((role) => !role.childRoles || role.childRoles.length === 0)
      .map((role) => roleMap.get(role.id));

    // Remove recursivamente o campo children se estiver vazio
    function removeEmptyChildrenField(node: any) {
      if (!node.children || node.children.length === 0) {
        delete node.children;
        return;
      }
      node.children.forEach((child: any) => removeEmptyChildrenField(child));
    }
    rootRoles.forEach((root) => removeEmptyChildrenField(root));

    return rootRoles;
  }

  async findOrCreate(name: string, description?: string): Promise<Role> {
    let role = await this.roleRepository.findOne({ where: { name } });
    if (!role) {
      role = this.roleRepository.create({ name, description });
      await this.roleRepository.save(role);
    }
    return role;
  }

  /**
   * Retorna todas as roles, incluindo a informação do bossRole.
   */
  async findAll(currentUser: any): Promise<Role[]> {
    const isAdministrator =
      currentUser.isMaster ||
      currentUser.userRoles.some((ur: { role: { roleRules: any[] } }) =>
        ur.role.roleRules.some(
          (rr: { rule: { rule: string } }) => rr.rule.rule === 'administrator',
        ),
      );

    const query = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'dep')
      .leftJoinAndSelect('dep.company', 'c')
      // Junta a hierarquia para obter o bossRole
      .leftJoinAndSelect('role.parentRoles', 'roleParent')
      .leftJoinAndSelect('roleParent.parentRole', 'bossRole');

    if (!isAdministrator) {
      const companyId = currentUser.selectedCompany.id;
      query.where('c.id = :companyId', { companyId });
    }

    const roles = await query.getMany();

    // Para cada role, injetamos o bossRole (se existir, pegamos o primeiro da relação)
    return roles.map((role) => ({
      ...role,
      bossRole:
        role.parentRoles && role.parentRoles.length > 0
          ? role.parentRoles[0].parentRole
          : null,
    }));
  }

  /**
   * Retorna uma role (findOne) incluindo a informação do bossRole.
   */
  async findOne(roleId: string, currentUser: any): Promise<any> {
    const isAdministrator =
      currentUser.isMaster ||
      currentUser.userRoles.some((ur: { role: { roleRules: any[] } }) =>
        ur.role.roleRules.some(
          (rr: { rule: { rule: string } }) => rr.rule.rule === 'administrator',
        ),
      );

    const query = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'dep')
      .leftJoinAndSelect('dep.company', 'c')
      .leftJoinAndSelect('role.userRoles', 'ur')
      .leftJoinAndSelect('ur.user', 'user')
      // Junta a hierarquia para obter o bossRole
      .leftJoinAndSelect('role.parentRoles', 'roleParent')
      .leftJoinAndSelect('roleParent.parentRole', 'bossRole')
      .where('role.id = :roleId', { roleId });

    if (!isAdministrator) {
      const companyId = currentUser.selectedCompany.id;
      query.andWhere('c.id = :companyId', { companyId });
    }

    const role = await query.getOne();

    if (!role) {
      throw new NotFoundException(
        'Role não encontrada ou não pertence à empresa selecionada.',
      );
    }

    const bossRole =
      role.parentRoles && role.parentRoles.length > 0
        ? role.parentRoles[0].parentRole
        : null;

    // Extrai os usuários associados à role
    const users = role.userRoles?.map((userRole) => userRole.user) || [];

    return { ...role, users, bossRole };
  }

  async findOneById(id: string): Promise<Role> {
    return this.roleRepository.findOne({ where: { id } });
  }

  async findOneWithDepartments(roleId: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { id: roleId },
      relations: [
        'roleDepartments',
        'roleDepartments.department',
        'roleDepartments.department.company',
      ],
    });
  }

  // ========== CRIAR ROLE ==========
  async create(dto: CreateRoleDto, currentUser: any): Promise<Role> {
    const { name, description, departmentIds, bossRoleId } = dto;

    const isAdministrator =
      currentUser.isMaster ||
      currentUser.userRoles.some((ur: { role: { roleRules: any[] } }) =>
        ur.role.roleRules.some(
          (rr: { rule: { rule: string } }) => rr.rule.rule === 'administrator',
        ),
      );

    if (!isAdministrator) {
      if (!currentUser.selectedCompany) {
        throw new BadRequestException(
          'Usuário não possui empresa selecionada.',
        );
      }
      const isCompanyAssociated = currentUser.userRoles.some(
        (ur: { role: { roleDepartments: any[] } }) =>
          ur.role.roleDepartments.some(
            (rd: { department: { company: { id: any } } }) =>
              rd.department.company.id === currentUser.selectedCompany.id,
          ),
      );
      if (!isCompanyAssociated) {
        throw new BadRequestException(
          'A empresa selecionada não está associada a este usuário.',
        );
      }
    }

    // Cria a role
    const role = this.roleRepository.create({ name, description });
    const savedRole = await this.roleRepository.save(role);

    // Verifica se o usuário tem a rule "team"
    const hasTeamRule = currentUser.userRoles.some(
      (ur: { role: { roleRules: any[] } }) =>
        ur.role.roleRules.some(
          (rr: { rule: { rule: string } }) => rr.rule.rule === 'team',
        ),
    );

    if (hasTeamRule) {
      await this.roleRuleService.linkRuleToRole(role.id, 'team');
    }

    // Cria as relações com os departamentos, se departmentIds forem informados
    if (departmentIds && departmentIds.length > 0) {
      for (const deptId of departmentIds) {
        const department = await this.departmentRepository.findOne({
          where: { id: deptId },
          relations: ['company'],
        });
        if (!department) {
          throw new NotFoundException(`Departamento ${deptId} não encontrado.`);
        }
        if (
          !isAdministrator &&
          department.company.id !== currentUser.selectedCompany.id
        ) {
          throw new ForbiddenException(
            `Departamento ${deptId} não pertence à empresa selecionada.`,
          );
        }
        const roleDep = this.roleDepartmentRepository.create({
          role: savedRole,
          department,
        });
        await this.roleDepartmentRepository.save(roleDep);
      }
    }

    // Cria a relação hierárquica, se bossRoleId for informado
    if (bossRoleId) {
      const bossRole = await this.roleRepository.findOne({
        where: { id: bossRoleId },
      });
      if (!bossRole) {
        throw new NotFoundException('Boss Role não encontrada.');
      }
      await this.roleHierarchyRepository.save({
        parentRole: bossRole,
        childRole: savedRole,
      });
    }

    return savedRole;
  }

  // ========== UPDATE ROLE (PATCH) ==========
  async update(
    id: string,
    dto: UpdateRoleDto,
    currentUser: any,
  ): Promise<Role> {
    const role = await this.findOne(id, currentUser);
    if (!role) {
      throw new NotFoundException('Role não encontrada.');
    }
    if (dto.name) role.name = dto.name;
    if (dto.description) role.description = dto.description;

    const updatedRole = await this.roleRepository.save(role);

    // Atualizar departamentos
    if (dto.departmentIds !== undefined) {
      await this.roleDepartmentRepository.delete({ role: { id: role.id } });
      if (dto.departmentIds.length > 0) {
        for (const deptId of dto.departmentIds) {
          const department = await this.departmentRepository.findOne({
            where: { id: deptId },
          });
          if (!department) {
            throw new NotFoundException(
              `Departamento ${deptId} não encontrado.`,
            );
          }
          await this.roleDepartmentRepository.save({
            role: updatedRole,
            department,
          });
        }
      }
    }

    // Atualizar a relação hierárquica se bossRoleId for informado
    if (dto.bossRoleId) {
      const bossRole = await this.roleRepository.findOne({
        where: { id: dto.bossRoleId },
      });
      if (!bossRole) {
        throw new NotFoundException('Boss Role não encontrada.');
      }
      await this.roleHierarchyRepository.delete({ childRole: { id: role.id } });
      await this.roleHierarchyRepository.save({
        parentRole: bossRole,
        childRole: updatedRole,
      });
    }

    return { ...updatedRole };
  }

  // ========== REMOVER ROLE (SOFT DELETE) ==========
  async remove(id: string, currentUser: any): Promise<void> {
    const role = await this.findOne(id, currentUser);
    const isUserInRole = role.users?.some((user) => user.id === currentUser.id);

    if (isUserInRole) {
      throw new BadRequestException(
        'Você está associado a esta role, portanto, não é possível excluí-la.',
      );
    }

    await this.roleRepository.softDelete(role.id);
  }

  async paginate(
    limit: number,
    page: number,
    filter: string | undefined,
    currentUser: any,
    companyParam: string,
  ) {
    const hasTeamRule = currentUser.rules.some(
      (r: { rule: string }) => r.rule === 'team',
    );

    if (!currentUser.selectedCompany) {
      throw new BadRequestException('Usuário não possui empresa selecionada.');
    }

    let companyId: string;
    if (hasTeamRule && companyParam) {
      companyId = companyParam;
    } else {
      companyId = currentUser.selectedCompany.id;
    }

    const query = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'dep')
      .leftJoinAndSelect('dep.company', 'c')
      .leftJoinAndSelect('role.childRoles', 'roleChild')
      .leftJoinAndSelect('roleChild.parentRole', 'bossRole');

    if (filter) {
      query.andWhere('role.name LIKE :filter', { filter: `%${filter}%` });
    }

    query.andWhere('c.id = :companyId', { companyId });
    query.take(limit);
    query.skip((page - 1) * limit);

    const [items, totalItems] = await query.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    const formattedItems = items.map((role) => {
      // Se existir um registro em childRoles, significa que há um boss definido
      const bossRole =
        role.childRoles && role.childRoles.length > 0
          ? role.childRoles.find((r) => r.parentRole.id !== role.id)
              ?.parentRole || null
          : null;
      return {
        ...role,
        bossRole,
      };
    });

    return {
      message: 'Roles retornadas com sucesso.',
      statusCode: 200,
      data: {
        items: formattedItems,
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }
}
