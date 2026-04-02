import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gender, User } from './entities/user.entity';
import { CreateOwnerUserDto } from './dtos/create-owner-user.dto';
import { RolesService } from '../roles/roles.service';
import { UserRoleService } from '../user-role/user-role.service';
import { CompaniesService } from '../companies/companies.service';
import { RoleDepartmentService } from '../role-department/role-department.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { QueryFailedError } from 'typeorm';
import { I18nService } from '../i18n/i18n.service';
import { UsersResponses } from './responses/users.responses';
import { Department } from '../departments/entities/departments.entiy';
import { Company } from '../companies/entities/companies.entity';
import { Role } from '../roles/entities/roles.entities';
import { Rule } from '../rules/entities.rules.entity';
import { RoleRule } from '../role-rule/entities/role-rule.entity';
import { EmailService } from '../email/email.service';
import { ConfirmationCodeService } from '../confirmation-codes/confirmation-code.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import * as bcrypt from 'bcrypt';
import { CreateCompanyDto } from '../companies/dtos/create-company.dto copy';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Rule)
    private readonly ruleRepository: Repository<Rule>,

    @InjectRepository(RoleRule)
    private readonly roleRuleRepository: Repository<RoleRule>,

    private readonly confirmationCodeService: ConfirmationCodeService,
    private readonly emailService: EmailService,
    private readonly rolesService: RolesService,
    private readonly userRoleService: UserRoleService,
    private readonly companiesService: CompaniesService,
    private readonly roleDepartmentService: RoleDepartmentService,
    private readonly i18nService: I18nService,
  ) {}

  async createOwner(createUserDto: CreateOwnerUserDto, language: string) {
    const {
      role,
      companyName,
      departmentNames,
      document, // CNPJ da empresa
      dontMail = false,
      ...userData
    } = createUserDto;

    // Gera valores padrão para campos obrigatórios se não foram fornecidos
    if (!userData.name || !userData.name.trim()) {
      userData.name = 'Sem nome';
    }
    if (!userData.lastName || !userData.lastName.trim()) {
      userData.lastName = '';
    }
    // Salva email como NULL se não foi fornecido (para evitar conflito com índice único)
    if (!userData.email || !userData.email.trim()) {
      userData.email = null as any;
    } else {
      // Verifica se o usuário já existe pelo e-mail (apenas se não estiver vazio)
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new BadRequestException(
          this.i18nService.translate(UsersResponses.DUPLICATE_ENTRY, language),
        );
      }
    }

    const rootUser = {
      ...userData,
      isRootUser: true,
      imageUrl: createUserDto.imageUrl ?? null,
    };
    // Criação do usuário (pode ter campos opcionais vazios)
    const user = this.userRepository.create(rootUser);
    await this.userRepository.save(user);

    // Criação da empresa com CNPJ
    const company = this.companyRepository.create({
      name: companyName,
      businessName: companyName,
      cnpj: document, // Salva o CNPJ na empresa
    } as CreateCompanyDto);
    await this.companyRepository.save(company);

    // Define a empresa recém-criada como selectedCompany do usuário
    user.selectedCompany = company;
    delete user.password; // Removemos a senha para não "double-hashear"
    await this.userRepository.save(user);

    // Criação dos departamentos (apenas se foram fornecidos)
    const departments = [];
    if (departmentNames && departmentNames.length > 0) {
      for (const departmentName of departmentNames) {
        if (departmentName && departmentName.trim()) {
          const department = this.departmentRepository.create({
            name: departmentName,
            company,
          });
          await this.departmentRepository.save(department);
          departments.push(department);
        }
      }
    }

    // Criação da role (apenas se foi fornecida)
    let createdRole = null;
    if (role && role.trim()) {
      createdRole = this.roleRepository.create({ name: role });
      await this.roleRepository.save(createdRole);

      // Associação da role ao usuário
      await this.userRoleService.assignRoleToUser(user, createdRole);
    }

    // Associação da role a cada departamento (apenas se role foi criada)
    if (createdRole) {
      for (const department of departments) {
        await this.roleDepartmentService.assignRoleToDepartment(
          createdRole,
          department,
        );
      }
    }

    // Associações das rules à role
    const DEFAULT_RULES = [
      // Equipe
      // 'team',

      // Usuários
      // 'administrator',
      'users.create',
      'users.paginate',
      'users.delete',
      'users.update',
      'users.findOne',
      'users.getMyProfile',
      'users.updateMe',
      'users.changePassword',

      // Cargos
      'roles.create',
      'roles.findAll',
      'roles.paginate',
      'roles.findOne',
      'roles.update',
      'roles.delete',

      // Departamentos
      'departments.create',
      'departments.findAll',
      'departments.findOne',
      'departments.update',
      'departments.delete',

      // Empresa
      'company.findOne',
      'company.update',
      'company.findAll',

      // Permissões
      'role-rule.findAll',
      'role-rule.update',

      // Serviços
      // 'services.create',
      // 'services.update',
      // 'services.findAll',
      // 'services.findOne',
      // 'services.remove',

      // Serviços da empresa
      // 'company-services.create',
      'company-services.findAll',
      // 'company-services.remove',

      // Password Vault
      'password-vault.view',
      'password-vault.create',
      'password-vault.update',
      'password-vault.delete',
    ];

    for (const ruleName of DEFAULT_RULES) {
      const rule = await this.ruleRepository.findOne({
        where: { rule: ruleName },
      });
      if (rule) {
        const roleRule = this.roleRuleRepository.create({
          role: createdRole,
          rule,
        });
        await this.roleRuleRepository.save(roleRule);
      }
    }

    // 3) Se não for para pular o e-mail, gera o código e envia
    let confirmationCode;
    if (!dontMail) {
      confirmationCode = await this.confirmationCodeService.createCode(
        user,
        'EMAIL_CONFIRMATION',
        10, // expira em 10 minutos
      );
      // Enviar o e-mail
      await this.emailService.sendConfirmationEmail(
        user,
        confirmationCode.code,
      );
    }

    // 4) Prepara o retorno (pode incluir ou não o código, se quiser)
    const message = this.i18nService.translate(
      UsersResponses.CREATE_SUCCESS,
      language,
    );

    // Remove o código de confirmação do objeto user
    delete (user as any)?.emailConfirmationCode;

    return { message, statusCode: 201, data: { user, company, departments } };
  }

  async createAssignedUser(
    createUserDto: Partial<CreateUserDto>,
    currentUser: any,
    language: string,
  ) {
    // Separa o campo "role" e mantém o restante dos dados do usuário
    const { role, password, imageUrl, ...userData } = createUserDto;

    try {
      const creator = currentUser;
      if (!creator) {
        throw new NotFoundException(
          this.i18nService.translate(
            UsersResponses.CREATOR_NOT_FOUND,
            language,
          ),
        );
      }

      // Verifica se o criador possui a rule 'administrator'
      const isAdministrator = creator.userRoles.some((userRole) =>
        userRole.role.roleRules.some(
          (roleRule) => roleRule.rule.rule === 'administrator',
        ),
      );

      // Determina a empresa efetiva (caso não seja administrador)
      let effectiveCompanyId: string | null = null;
      if (!isAdministrator) {
        effectiveCompanyId = creator.selectedCompany?.id;
        if (!effectiveCompanyId) {
          throw new BadRequestException(
            this.i18nService.translate(
              UsersResponses.NO_SELECTED_COMPANY,
              language,
            ),
          );
        }
        // Verifica se a empresa selecionada está associada ao criador
        const isCompanyAssociated = creator.userRoles.some((userRole) =>
          userRole.role.roleDepartments.some(
            (roleDept) => roleDept.department.company.id === effectiveCompanyId,
          ),
        );
        if (!isCompanyAssociated) {
          throw new BadRequestException(
            this.i18nService.translate(
              UsersResponses.COMPANY_NOT_ASSOCIATED_WITH_USER,
              language,
            ),
          );
        }
      }

      if (!role || role === '') {
        throw new BadRequestException(
          this.i18nService.translate(UsersResponses.PROVIDE_A_ROLE, language),
        );
      }

      // Busca a role com seus departamentos (trata 'role' como string única)
      const foundRole = await this.rolesService.findOneWithDepartments(role);
      if (!foundRole) {
        throw new NotFoundException(
          this.i18nService.translate(UsersResponses.ROLE_NOT_FOUND, language),
        );
      }
      if (!isAdministrator) {
        const belongsToSelectedCompany = foundRole.roleDepartments.some(
          (rd) => rd.department.company.id === effectiveCompanyId,
        );
        if (!belongsToSelectedCompany) {
          throw new BadRequestException(
            this.i18nService.translate(
              UsersResponses.ROLE_NOT_ASSOCIATE_WITH_COMPANY,
              language,
            ),
          );
        }
      }

      // Transforma os dados para garantir que os tipos sejam compatíveis com a entidade.
      // Converte 'gender' para o enum Gender e 'birthdate' para Date (se fornecido).
      const transformedUserData: Partial<User> = {
        ...userData,
        imageUrl: imageUrl ?? null,
        password: password || null,
        gender:
          userData.gender === 'M'
            ? Gender.M
            : userData.gender === 'F'
              ? Gender.F
              : undefined,
        birthdate: userData.birthdate
          ? new Date(userData.birthdate)
          : undefined,
      };

      // Cria o novo usuário utilizando todos os campos enviados
      const user = this.userRepository.create(transformedUserData);
      await this.userRepository.save(user);

      // Define a mesma empresa selecionada do criador para o novo usuário
      user.selectedCompany = creator.selectedCompany;
      // Remove a senha antes de retornar a resposta para evitar expô-la
      delete user.password;
      await this.userRepository.save(user);

      // Associa a role encontrada ao usuário
      await this.userRoleService.assignRoleToUser(user, foundRole);

      return {
        message: this.i18nService.translate(
          UsersResponses.CREATE_SUCCESS,
          language,
        ),
        statusCode: 201,
        data: user,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      ) {
        throw new BadRequestException(
          this.i18nService.translate(UsersResponses.DUPLICATE_ENTRY, language),
        );
      }
      throw error;
    }
  }

  async updateAssignedUser(
    userId: string,
    updateUserDto: Partial<UpdateUserDto>,
    currentUser: any,
    language: string,
  ) {
    try {
      // 1. Verifica se o usuário atual (criador) existe e se possui as permissões necessárias
      const creator = currentUser;
      if (!creator) {
        throw new NotFoundException(
          this.i18nService.translate(
            UsersResponses.CREATOR_NOT_FOUND,
            language,
          ),
        );
      }
      const isAdministrator = creator.userRoles.some((userRole) =>
        userRole.role.roleRules.some(
          (roleRule) => roleRule.rule.rule === 'administrator',
        ),
      );

      let effectiveCompanyId: string | null = null;
      if (!isAdministrator) {
        effectiveCompanyId = creator.selectedCompany?.id;
        if (!effectiveCompanyId) {
          throw new BadRequestException(
            this.i18nService.translate(
              UsersResponses.NO_SELECTED_COMPANY,
              language,
            ),
          );
        }
        // const isCompanyAssociated = creator.userRoles.some((userRole) =>
        //   userRole.role.roleDepartments.some(
        //     (roleDept) => roleDept.department.company.id === effectiveCompanyId,
        //   ),
        // );
        // if (!isCompanyAssociated) {
        //   throw new BadRequestException(
        //     this.i18nService.translate(
        //       UsersResponses.COMPANY_NOT_ASSOCIATED_WITH_USER,
        //       language,
        //     ),
        //   );
        // }
      }

      // 2. Busca o usuário que será atualizado
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['userRoles', 'userRoles.role'],
      });
      if (!user) {
        throw new NotFoundException(
          this.i18nService.translate(UsersResponses.NOT_FOUND, language),
        );
      }

      // 3. Separe o campo de roles (caso venha) para tratamento à parte
      const { role, roleId, ...fieldsToUpdate } = updateUserDto as any;

      // 4. Realize as conversões necessárias para campos específicos
      if (fieldsToUpdate.birthdate) {
        const dateValue = new Date(fieldsToUpdate.birthdate);
        fieldsToUpdate.birthdate = dateValue.toISOString();
      }

      if (fieldsToUpdate.gender) {
        // Caso seja necessário transformar para o enum Gender
        fieldsToUpdate.gender =
          fieldsToUpdate.gender === 'M'
            ? Gender.M
            : fieldsToUpdate.gender === 'F'
              ? Gender.F
              : fieldsToUpdate.gender;
      }

      // 5. Atualize dinamicamente os campos enviados
      Object.assign(user, fieldsToUpdate);
      await this.userRepository.save(user);

      // 6. Se um novo(s) role(s) foi(foram) enviado(s), trate a atualização das roles
      if (role && Array.isArray(role) && role.length > 0) {
        const validRoles = [];
        for (const roleId of role) {
          const foundRole =
            await this.rolesService.findOneWithDepartments(roleId);
          if (!foundRole) {
            throw new NotFoundException(
              this.i18nService.translate(
                UsersResponses.ROLE_NOT_FOUND,
                language,
              ),
            );
          }
          if (!isAdministrator) {
            const belongsToSelectedCompany = foundRole.roleDepartments.some(
              (rd) => rd.department.company.id === effectiveCompanyId,
            );
            if (!belongsToSelectedCompany) {
              throw new BadRequestException(
                this.i18nService.translate(
                  UsersResponses.ROLE_NOT_ASSOCIATE_WITH_COMPANY,
                  language,
                ),
              );
            }
          }
          validRoles.push(foundRole);
        }
        // Remove as roles atuais (ou atualize conforme a lógica do sistema)
        for (const ur of user.userRoles) {
          await this.userRoleService.removeUserRole(ur.id);
        }
        // Associa as novas roles
        for (const r of validRoles) {
          await this.userRoleService.assignRoleToUser(user, r);
        }
      }

      if (roleId) {
        const foundRole =
          await this.rolesService.findOneWithDepartments(roleId);
        if (!foundRole) {
          throw new NotFoundException(
            this.i18nService.translate(UsersResponses.ROLE_NOT_FOUND, language),
          );
        }
        for (const ur of user.userRoles) {
          await this.userRoleService.removeUserRole(ur.id);
        }
        await this.userRoleService.assignRoleToUser(user, roleId);
      }

      return {
        message: this.i18nService.translate(
          UsersResponses.UPDATE_SUCCESS,
          language,
        ),
        statusCode: 200,
        data: user,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === 'ER_DUP_ENTRY'
      ) {
        throw new BadRequestException(
          this.i18nService.translate(UsersResponses.DUPLICATE_ENTRY, language),
        );
      }
      throw error;
    }
  }

  /**
   * Busca um usuário apenas pelo ID, sem filtros de empresa
   * Útil para operações com clientes (isRootUser)
   * Inclui usuários deletados (soft-delete) para permitir verificação antes de deletar novamente
   */
  async findOneById(userId: string): Promise<User | null> {
    try {
      // Primeiro, tenta buscar usando findOne direto (mais simples)
      const userDirect = await this.userRepository.findOne({
        where: { id: userId },
        withDeleted: true,
      });

      if (userDirect) {
        console.log(`[findOneById] Usuário encontrado via findOne: ${userDirect.id}, isRootUser: ${userDirect.isRootUser}`);
        // Se encontrou, busca com relacionamentos
        const userWithRelations = await this.userRepository
          .createQueryBuilder('user')
          .withDeleted()
          .leftJoinAndSelect('user.userRoles', 'ur')
          .leftJoinAndSelect('ur.role', 'r')
          .leftJoinAndSelect('r.roleDepartments', 'rd')
          .leftJoinAndSelect('rd.department', 'd')
          .leftJoinAndSelect('d.company', 'c')
          .leftJoinAndSelect('user.selectedCompany', 'selectedCompany')
          .where('user.id = :userId', { userId })
          .getOne();

        return userWithRelations || userDirect;
      }

      // Se não encontrou com findOne, tenta com QueryBuilder
      console.log(`[findOneById] Tentando busca com QueryBuilder para ID: ${userId}`);
      const userBasic = await this.userRepository
        .createQueryBuilder('user')
        .withDeleted()
        .where('user.id = :userId', { userId })
        .getOne();

      if (!userBasic) {
        console.log(`[findOneById] Usuário com ID ${userId} não encontrado no banco de dados`);
        return null;
      }

      console.log(`[findOneById] Usuário encontrado via QueryBuilder: ${userBasic.id}, isRootUser: ${userBasic.isRootUser}`);

      // Busca com relacionamentos
      const user = await this.userRepository
        .createQueryBuilder('user')
        .withDeleted()
        .leftJoinAndSelect('user.userRoles', 'ur')
        .leftJoinAndSelect('ur.role', 'r')
        .leftJoinAndSelect('r.roleDepartments', 'rd')
        .leftJoinAndSelect('rd.department', 'd')
        .leftJoinAndSelect('d.company', 'c')
        .leftJoinAndSelect('user.selectedCompany', 'selectedCompany')
        .where('user.id = :userId', { userId })
        .getOne();

      return user || userBasic;
    } catch (error) {
      console.error(`[findOneById] Erro ao buscar usuário por ID ${userId}:`, error);
      return null;
    }
  }

  async findOne(
    userId: string,
    selectedCompanyId: string,
    isAdministrator: boolean,
    language: string,
    isInAdminTeam?: boolean,
  ) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'ur')
      .leftJoinAndSelect('ur.role', 'r')
      .leftJoinAndSelect('r.roleDepartments', 'rd')
      .leftJoinAndSelect('rd.department', 'd')
      .leftJoinAndSelect('d.company', 'c')
      .where('user.id = :userId', { userId });

    // Adiciona a restrição de empresa apenas se o usuário não for administrador e não estiver no adminTEAM
    if (!isAdministrator && !isInAdminTeam) {
      query.andWhere('c.id = :companyId', { companyId: selectedCompanyId });
    }

    const user = await query.getOne();

    if (!user) {
      throw new NotFoundException(
        isAdministrator
          ? this.i18nService.translate(UsersResponses.NOT_FOUND, language)
          : this.i18nService.translate(
              UsersResponses.NOT_BELONG_TO_SELECTED_COMPANY,
              language,
            ),
      );
    }

    return user;
  }

  async paginate(
    limit: number,
    page: number,
    filter: string | undefined,
    isRootUsers: boolean,
    selectedCompanyId: string, // Sempre busca pela empresa selecionada
    isAdministrator: boolean, // Indica se o usuário é administrador
    language: string,
  ) {
    const query = this.userRepository.createQueryBuilder('user');

    // Verifica se o filtro é para usuários root
    if (isRootUsers) {
      // Retorna apenas usuários com isRootUser = true
      query
        .where('user.isRootUser = :isRootUser', { isRootUser: true })
        .leftJoinAndSelect('user.selectedCompany', 'selectedCompany');
    } else {
      // Inclui os relacionamentos para administradores e usuários regulares
      query
        .leftJoinAndSelect('user.userRoles', 'ur')
        .leftJoinAndSelect('ur.role', 'r')
        .leftJoinAndSelect('r.roleDepartments', 'rd')
        .leftJoinAndSelect('rd.department', 'd')
        .leftJoinAndSelect('d.company', 'c')
        .leftJoinAndSelect('user.selectedCompany', 'selectedCompany');

      // Para selects, todos os usuários (admin ou não) devem ver usuários da mesma empresa selecionada
      // Isso é seguro porque todos estão na mesma empresa e é necessário para usar selects
      query.where('user.selectedCompany = :companyId', {
        companyId: selectedCompanyId,
      });
      
      // Exclui usuários deletados (soft delete)
      query.andWhere('user.deleted_at IS NULL');
    }

    // Aplica filtro por nome, se fornecido
    if (filter) {
      query.andWhere('user.name LIKE :filter', { filter: `%${filter}%` });
    }

    // Configura a paginação
    query.take(limit);
    query.skip((page - 1) * limit);

    // Executa consulta
    const [items, totalItems] = await query.getManyAndCount();
    
    console.log('[UsersService.paginate]', {
      isAdministrator,
      selectedCompanyId,
      totalItems,
      itemsCount: items.length,
      querySql: query.getSql()
    });

    const totalPages = Math.ceil(totalItems / limit);

    // Retorna os dados com as informações das empresas em um array
    return {
      message: this.i18nService.translate(UsersResponses.RETRIEVED, language),
      statusCode: 200,
      data: {
        items: items.map((user) => ({
          ...user,
          companies: user.selectedCompany
            ? [
                {
                  id: user.selectedCompany.id,
                  name: user.selectedCompany.name,
                  cnpj: user.selectedCompany.cnpj,
                  imageUrl: user.selectedCompany.imageUrl,
                },
              ]
            : [],
        })),
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }

  async delete(
    id: string,
    selectedCompanyId: string,
    isAdministrator: boolean,
    language: string,
  ) {
    // Busca o usuário com os relacionamentos relevantes
    const userToDelete = await this.findOneById(id);

    if (!userToDelete) {
      throw new NotFoundException(
        this.i18nService.translate(UsersResponses.NOT_FOUND, language),
      );
    }

    // Se for cliente (isRootUser), não precisa verificar pertencimento à empresa
    // A verificação de permissão já foi feita no controller
    if (!userToDelete.isRootUser) {
      // Para usuários normais, verifica se pertencem à mesma empresa
      const belongsToSameCompany = userToDelete.userRoles?.some((userRole) =>
        userRole.role?.roleDepartments?.some(
          (roleDept) => roleDept.department?.company?.id === selectedCompanyId,
        ),
      );

      if (!isAdministrator && !belongsToSameCompany) {
        throw new ForbiddenException(
          this.i18nService.translate(
            UsersResponses.NO_PERMISSION_DELETE,
            language,
          ),
        );
      }
    }

    // Realiza a exclusão lógica
    await this.userRepository.softDelete(id);

    return {
      message: this.i18nService.translate(
        UsersResponses.DELETE_SUCCESS,
        language,
      ),
      statusCode: 200,
      data: {},
    };
  }

  //Funções auxiliares

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }
  async findOneWithRelations(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'selectedCompany',
        'selectedCompany.departments',
        'userRoles',
        'userRoles.role',
        'userRoles.role.roleRules',
        'userRoles.role.roleRules.rule',
        'userRoles.role.roleDepartments',
        'userRoles.role.roleDepartments.department',
        'userRoles.role.roleDepartments.department.company',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Extraindo todas as rules associadas ao usuário
    const rules = user.userRoles
      .flatMap((userRole) => userRole.role.roleRules) // Obtém todos os `roleRules` de cada `role`
      .map((roleRule) => roleRule.rule); // Obtém a `rule` de cada `roleRule`

    return {
      ...user,
      rules, // Adiciona as rules ao JSON de retorno
    };
  }

  async findOneWithRelationsByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: [
        'selectedCompany',
        'userRoles',
        'userRoles.role',
        'userRoles.role.roleRules',
        'userRoles.role.roleRules.rule',
        'userRoles.role.roleDepartments',
        'userRoles.role.roleDepartments.department',
        'userRoles.role.roleDepartments.department.company',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    const rules = user.userRoles
      .flatMap((userRole) => userRole.role.roleRules) // Obtém todos os `roleRules` de cada `role`
      .map((roleRule) => roleRule.rule); // Obtém a `rule` de cada `roleRule`

    // Retorna uma instância válida de User com a propriedade `rules` adicionada
    return Object.assign(new User(), user, { rules });
  }

  async updateSelectedCompany(
    userId: string,
    companyId: string,
    language: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.roleRules',
        'userRoles.role.roleRules.rule', // Inclui as rules associadas às roles
        'userRoles.role.roleDepartments',
        'userRoles.role.roleDepartments.department',
        'userRoles.role.roleDepartments.department.company',
      ],
    });
    if (!user) {
      throw new NotFoundException(
        this.i18nService.translate(UsersResponses.NOT_FOUND, language),
      );
    }

    const company = await this.companiesService.findOne(companyId);
    if (!company) {
      throw new NotFoundException(
        this.i18nService.translate(UsersResponses.COMPANY_NOT_FOUND, language),
      );
    }

    // Verifica se o usuário tem a rule "team"
    const hasTeamRule = user.userRoles.some((userRole) =>
      userRole.role.roleRules.some(
        (roleRule) => roleRule.rule.rule.toLowerCase() === 'team',
      ),
    );

    // Verifica se o usuário está associado à empresa
    const isAssociated =
      hasTeamRule ||
      user.userRoles.some((userRole) =>
        userRole.role.roleDepartments.some(
          (roleDept) => roleDept.department?.company?.id === companyId,
        ),
      );

    if (!isAssociated) {
      throw new BadRequestException(
        this.i18nService.translate(
          UsersResponses.COMPANY_NOT_ASSOCIATED_WITH_USER,
          language,
        ),
      );
    }

    user.selectedCompany = company;
    delete user.password;
    await this.userRepository.save(user);

    return {
      message: this.i18nService.translate(
        UsersResponses.COMPANY_SELECTED_UPDATED,
        language,
      ),
      user,
    };
  }

  async updateLoggedUser(
    userId: string,
    updateUserDto: Partial<UpdateUserDto>,
    language: string,
  ) {
    // 1. Localiza o usuário no banco
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(
        this.i18nService.translate(UsersResponses.NOT_FOUND, language),
      );
    }

    // 2. Atualiza apenas os campos que realmente foram enviados (ignorando undefined)
    Object.assign(user, updateUserDto);

    // ⚠️ Removemos os campos sensíveis para evitar serem retornados no response
    delete user.email;
    delete user.password;

    // 3. Salva alterações no banco
    await this.userRepository.save(user);

    return {
      message: this.i18nService.translate(
        UsersResponses.UPDATE_SUCCESS,
        language,
      ),
      statusCode: 200,
      data: user,
    };
  }

  /**
   * Retorna os dados do usuário logado,
   * carregando as relações que forem necessárias.
   */
  async getMyProfile(userId: string, language: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['selectedCompany', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException(
        this.i18nService.translate(UsersResponses.NOT_FOUND, language),
      );
    }

    return {
      message: 'Perfil retornado com sucesso',
      statusCode: 200,
      data: user,
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    language: string,
  ) {
    const { oldPassword, password } = changePasswordDto;

    if (!oldPassword || !password) {
      // Caso queira exigir ambos os campos
      throw new BadRequestException(
        this.i18nService.translate(
          UsersResponses.PROVIDE_OLD_AND_NEW_PASSWORD,
          language,
        ),
      );
    }

    // 1) Localiza o usuário
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(
        this.i18nService.translate(UsersResponses.NOT_FOUND, language),
      );
    }

    // 2) Compara a senha antiga (usamos bcrypt, assumindo user.password está hasheado)
    const passwordMatches = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatches) {
      throw new BadRequestException(
        this.i18nService.translate(
          UsersResponses.OLD_PASSWORD_INCORRECT,
          language,
        ),
      );
    }

    // 3) Checa se a nova senha não é igual à antiga, se quiser impor essa regra
    const sameAsOld = await bcrypt.compare(password, user.password);
    if (sameAsOld) {
      throw new BadRequestException(
        this.i18nService.translate(
          UsersResponses.NEW_PASSWORD_SAME_OLD,
          language,
        ),
      );
    }

    // 4) Atribui a nova senha
    user.password = password; // a entity deve hashear via @BeforeUpdate() ou similar
    await this.userRepository.save(user);

    return {
      message: this.i18nService.translate(
        UsersResponses.PASSWORD_UPDATED_SUCCESS,
        language,
      ),
      statusCode: 200,
      data: {},
    };
  }

  // users.service.ts
  async getTeamUsersPaginated(
    limit: number,
    page: number,
    selectedCompanyId: string,
    language: string,
    filter?: string,
    role?: string,
  ): Promise<{
    message: string;
    statusCode: number;
    data: {
      items: Partial<User>[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  }> {
    // Cria o query builder e seleciona somente os campos básicos
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.userRoles', 'ur')
      .leftJoin('ur.role', 'r')
      .leftJoin('r.roleRules', 'rr')
      .select([
        'user.id',
        'user.name',
        'user.lastName',
        'user.email',
        'user.imageUrl',
      ])
      .where('rr.rule = :rule', { rule: 'team' })
      .andWhere('user.selectedCompany = :companyId', {
        companyId: selectedCompanyId,
      });

    // Aplica filtro por nome/sobrenome
    if (filter) {
      const searchTerms = filter.split(' ').filter((term) => term.length > 0);
      if (searchTerms.length > 0) {
        query.andWhere(
          searchTerms
            .map(
              (term) => `(
              user.name LIKE :term${searchTerms.indexOf(term)} OR 
              user.lastName LIKE :term${searchTerms.indexOf(term)}
            )`,
            )
            .join(' AND '),
          searchTerms.reduce(
            (acc, term, index) => ({
              ...acc,
              [`term${index}`]: `%${term}%`,
            }),
            {},
          ),
        );
      }
    }

    // Aplica filtro por roleId
    if (role) {
      query.andWhere('r.id = :roleId', { roleId: role });
    }

    // Aplica paginação
    query.take(limit);
    query.skip((page - 1) * limit);

    const [items, totalItems] = await query.getManyAndCount();
    console.log('🚀 ~ UsersService ~ items:', items);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Usuários com a rule "team" retornados com sucesso.',
      statusCode: 200,
      data: {
        items,
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findDefault(): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: '1' } });
    if (!user) {
      throw new NotFoundException('Usuário padrão não encontrado');
    }
    return user;
  }
}
