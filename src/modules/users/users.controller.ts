import {
  Controller,
  Post,
  Delete,
  Get,
  Query,
  Param,
  Body,
  UseGuards,
  Patch,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateOwnerUserDto } from './dtos/create-owner-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from 'src/common/decorators/user.decorator';
import { Rule } from 'src/common/decorators/rule.decorator';
import { RulesGuard } from 'src/common/guards/rules.guard';

// Importações do Swagger
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';

@ApiTags('Users') // agrupa as rotas no Swagger sob "Users"
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  // Novo endpoint para listar usuários com a rule "team"
  @ApiOperation({ summary: 'Lista usuários com a rule "team" com paginação' })
  @ApiBearerAuth('JWT')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de itens por página',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    description: 'Filtro por nome e/ou sobrenome',
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    type: String,
    description: 'ID do cargo para filtrar usuários',
  })
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Get('/team')
  async getTeamUsers(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @User() currentUser: any,
    @Req() req: any,
    @Query('filter') filter?: string,
    @Query('role') role?: string,
  ): Promise<any> {
    const hasTeamRule = currentUser.rules.some(
      (r: { rule: string }) => r.rule === 'team',
    );

    if (!currentUser.selectedCompany) {
      throw new BadRequestException('Usuário não possui empresa selecionada.');
    }

    // Recupera o id da empresa selecionada do usuário logado
    let selectedCompanyId: string;

    if (hasTeamRule) {
      selectedCompanyId = '1';
    } else {
      selectedCompanyId = currentUser.selectedCompany?.id;
    }

    if (!selectedCompanyId) {
      throw new BadRequestException(
        'Nenhuma empresa selecionada para o usuário atual.',
      );
    }

    return this.usersService.getTeamUsersPaginated(
      limit || 10,
      page || 1,
      selectedCompanyId,
      req.language,
      filter,
      role,
    );
  }

  @ApiOperation({ summary: 'Atualiza dados do usuário logado' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiBody({
    type: UpdateUserDto,
    description: 'Campos para atualizar o próprio usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário (logado) atualizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado (se token estiver incorreto)',
    type: NotFoundException,
  })
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('users.updateMe')
  @Patch('/me')
  @UseInterceptors(FileInterceptor('file')) // Intercepta o arquivo enviado
  async updateMe(
    @Req() req: any,
    @User() currentUser: any,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File, // Recebe o arquivo enviado
  ) {
    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'users'); // Usa o serviço de storage
    }

    if (imageUrl) {
      updateUserDto.imageUrl = imageUrl;
    }

    return this.usersService.updateLoggedUser(
      currentUser.id,
      updateUserDto,
      req.language,
    );
  }

  @ApiOperation({ summary: 'Cria o usuário Owner e sua empresa' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBody({
    type: CreateOwnerUserDto,
    description: 'Dados para criar Owner + empresa',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário Owner criado com sucesso, bem como a empresa.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou entrada duplicada.',
    type: BadRequestException,
  })
  @Rule('customers.create')
  @Post('/create-owner')
  @UseInterceptors(FileInterceptor('file'))
  async createOwner(
    @Body() createOwnerUserDto: CreateOwnerUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'users');
      createOwnerUserDto.imageUrl = imageUrl;
    }
    return this.usersService.createOwner(createOwnerUserDto, req.language);
  }

  @ApiOperation({ summary: 'Cria um novo usuário (assignedUser)' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT') // rota protegida
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        password: { type: 'string', example: '123456' },
        roles: {
          type: 'array',
          items: { type: 'string', example: 'uuid_da_role' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos, entrada duplicada ou empresa não associada.',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário criador (creator) não encontrado.',
    type: NotFoundException,
  })
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('users.create')
  @Post('/')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createUserDto: Partial<CreateUserDto>,
    @User() currentUser: any,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'users');
      createUserDto.imageUrl = imageUrl;
    }

    return this.usersService.createAssignedUser(
      createUserDto,
      currentUser,
      req.language,
    );
  }

  @ApiOperation({ summary: 'Atualiza dados de um usuário' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'UUID do usuário a ser atualizado',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Campos para atualizar o usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou empresa não associada.',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @UseGuards(JwtAuthGuard)
  @Patch('/:id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() currentUser: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;

    // Busca o usuário diretamente pelo ID (sem filtro de empresa para clientes)
    let user = await this.usersService.findOneById(id);
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    
    // Verifica se é administrador
    const isAdministrator = currentUser.isMaster || 
      currentUser.userRoles?.some((userRole: any) =>
        userRole.role?.roleRules?.some(
          (roleRule: any) => roleRule.rule?.rule === 'administrator',
        ),
      );
    
    // Se for cliente, verifica permissão customers.update; senão, verifica users.update
    if (user.isRootUser) {
      // Para clientes, verifica customers.update
      if (!isAdministrator) {
        // Verifica se tem a regra customers.update nas rules do payload
        const hasCustomerUpdateRule = currentUser.rules?.some((rule: any) => rule.rule === 'customers.update');
        
        // Se não encontrar nas rules do payload, tenta verificar em userRoles (se disponível)
        let hasPermission = hasCustomerUpdateRule;
        
        if (!hasPermission && currentUser.userRoles) {
          const selectedCompanyId = currentUser.selectedCompany?.id;
          hasPermission = currentUser.userRoles.some((userRole: any) => {
            const roleRules = userRole.role?.roleRules || [];
            const roleDepartments = userRole.role?.roleDepartments || [];
            
            return roleRules.some(
              (roleRule: any) =>
                roleRule.rule?.rule === 'customers.update' &&
                roleDepartments.some(
                  (roleDept: any) =>
                    roleDept.department?.company?.id === selectedCompanyId,
                ),
            );
          });
        }
        
        if (!hasPermission) {
          throw new ForbiddenException('Você não tem permissão para atualizar este cliente.');
        }
      }
    } else {
      // Para usuários normais, verifica users.update e se pertence à mesma empresa
      if (!isAdministrator) {
        const selectedCompanyId = currentUser.selectedCompany?.id;
        const hasPermission = currentUser.userRoles?.some((userRole: any) => {
          const roleRules = userRole.role?.roleRules || [];
          const roleDepartments = userRole.role?.roleDepartments || [];
          
          return roleRules.some(
            (roleRule: any) =>
              roleRule.rule?.rule === 'users.update' &&
              roleDepartments.some(
                (roleDept: any) =>
                  roleDept.department?.company?.id === selectedCompanyId,
              ),
          );
        });
        
        if (!hasPermission) {
          throw new ForbiddenException('Você não tem permissão para atualizar este usuário.');
        }
        
        // Verifica se o usuário pertence à mesma empresa
        const belongsToSameCompany = user.userRoles?.some((userRole: any) =>
          userRole.role?.roleDepartments?.some(
            (roleDept: any) => roleDept.department?.company?.id === selectedCompanyId,
          ),
        );
        
        if (!belongsToSameCompany) {
          throw new ForbiddenException('Usuário não pertence à empresa selecionada.');
        }
      }
    }
    
    const oldImageUrl = user?.imageUrl || null;

    if (file) {
      imageUrl = await this.storageService.uploadFile(file, 'users');

      if (oldImageUrl && !oldImageUrl.includes(imageUrl)) {
        const filename = oldImageUrl.split('/').pop();
        if (filename) {
          try {
            await this.storageService.deleteFile(filename);
          } catch (e) {
            console.warn('Não foi possível deletar imagem antiga:', e?.message);
          }
        }
      }
    }

    if (imageUrl) {
      updateUserDto.imageUrl = imageUrl;
    }

    return this.usersService.updateAssignedUser(
      id,
      updateUserDto,
      currentUser,
      req.language,
    );
  }

  @ApiOperation({ summary: 'Retorna dados de um usuário específico' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'UUID do usuário a ser retornado',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário retornado com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Usuário não encontrado ou não pertence à empresa selecionada.',
    type: NotFoundException,
  })
  /**
   * Retorna usuários para uso em selects/formulários
   * Acesso liberado para qualquer usuário autenticado da empresa selecionada
   * (não requer permissão específica, pois é necessário para uso em formulários)
   * IMPORTANTE: Esta rota deve estar ANTES de /:id para não ser interceptada
   */
  @UseGuards(JwtAuthGuard)
  @Get('/select')
  @ApiOperation({ summary: 'Retorna usuários para uso em selects/formulários' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados/filtros inválidos.',
    type: BadRequestException,
  })
  async select(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @User() currentUser: any,
    @Req() req: any,
    @Query('filter') filter?: string,
  ) {
    if (!currentUser.selectedCompany) {
      throw new BadRequestException('Usuário não possui empresa selecionada.');
    }
    
    const selectedCompanyId = currentUser.selectedCompany.id;
    
    // Verifica se é administrador (master ou tem regra administrator)
    const isAdministrator = currentUser.isMaster || 
      currentUser.rules?.some((rule: any) => rule.rule === 'administrator') ||
      currentUser.userRoles?.some((userRole: any) =>
        userRole.role?.roleRules?.some(
          (roleRule: any) => roleRule.rule?.rule === 'administrator',
        ),
      );
    
    const result = await this.usersService.paginate(
      +limit || 100,
      +page || 1,
      filter,
      false, // isRootUsers
      selectedCompanyId,
      isAdministrator,
      req.language,
    );
    
    console.log('[GET /users/select]', {
      selectedCompanyId,
      isAdministrator,
      isMaster: currentUser.isMaster,
      userId: currentUser.id,
      totalUsers: result.data?.totalItems || 0,
      returnedUsers: result.data?.items?.length || 0
    });
    
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
    @User() currentUser: any,
  ) {
    // Tenta buscar primeiro sem filtro de empresa (para clientes)
    let user = await this.usersService.findOneById(id);
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    
    // Verifica se é administrador
    const isAdministrator = currentUser.isMaster || 
      currentUser.userRoles?.some((userRole: any) =>
        userRole.role?.roleRules?.some(
          (roleRule: any) => roleRule.rule?.rule === 'administrator',
        ),
      );
    
    // Se for cliente, verifica permissão customers.view; senão, verifica users.findOne
    if (user.isRootUser) {
      // Para clientes, verifica customers.view
      if (!isAdministrator) {
        // Verifica se tem a regra customers.view nas rules do payload
        const hasCustomerViewRule = currentUser.rules?.some((rule: any) => rule.rule === 'customers.view');
        
        // Se não encontrar nas rules do payload, tenta verificar em userRoles (se disponível)
        let hasPermission = hasCustomerViewRule;
        
        if (!hasPermission && currentUser.userRoles) {
          const selectedCompanyId = currentUser.selectedCompany?.id;
          hasPermission = currentUser.userRoles.some((userRole: any) => {
            const roleRules = userRole.role?.roleRules || [];
            const roleDepartments = userRole.role?.roleDepartments || [];
            
            return roleRules.some(
              (roleRule: any) =>
                roleRule.rule?.rule === 'customers.view' &&
                roleDepartments.some(
                  (roleDept: any) =>
                    roleDept.department?.company?.id === selectedCompanyId,
                ),
            );
          });
        }
        
        if (!hasPermission) {
          throw new ForbiddenException('Você não tem permissão para visualizar este cliente.');
        }
      }
      
      return {
        message: 'User retrieved successfully',
        statusCode: 200,
        data: user,
      };
    }
    
    // Para usuários normais, verifica users.findOne e se pertence à mesma empresa
    if (!isAdministrator) {
      const selectedCompanyId = currentUser.selectedCompany?.id;
      const hasPermission = currentUser.userRoles?.some((userRole: any) => {
        const roleRules = userRole.role?.roleRules || [];
        const roleDepartments = userRole.role?.roleDepartments || [];
        
        // Verifica users.findOne ou team
        const hasTeamRule = roleRules.some((roleRule: any) => roleRule.rule?.rule === 'team');
        const hasUsersFindOne = roleRules.some(
          (roleRule: any) =>
            roleRule.rule?.rule === 'users.findOne' &&
            roleDepartments.some(
              (roleDept: any) =>
                roleDept.department?.company?.id === selectedCompanyId,
            ),
        );
        
        return hasTeamRule || hasUsersFindOne;
      });
      
      if (!hasPermission) {
        throw new ForbiddenException('Você não tem permissão para visualizar este usuário.');
      }
      
      // Verifica se o usuário pertence à mesma empresa
      const belongsToSameCompany = user.userRoles?.some((userRole: any) =>
        userRole.role?.roleDepartments?.some(
          (roleDept: any) => roleDept.department?.company?.id === selectedCompanyId,
        ),
      );
      
      if (!belongsToSameCompany) {
        throw new ForbiddenException('Usuário não pertence à empresa selecionada.');
      }
    }
    
    return {
      message: 'User retrieved successfully',
      statusCode: 200,
      data: user,
    };
  }

  @ApiOperation({ summary: 'Lista/filtra usuários com paginação' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Quantidade de itens por página',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Número da página',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: 'string',
    description: 'Filtro por nome do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados/filtros inválidos.',
    type: BadRequestException,
  })
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('users.paginate')
  @Get('/')
  async paginate(
    @Req() req: any,
    @Query('limit') limit: number,
    @Query('page') page: number,
    @User() currentUser: any,
    @Query('filter') filter?: string,
    @Query('root') rootUsers?: string,
  ) {
    const selectedCompanyId = currentUser.selectedCompany.id;
    const isRootUser = rootUsers === 'true' ? true : false;
    return this.usersService.paginate(
      +limit || 10,
      +page || 1,
      filter,
      isRootUser,
      selectedCompanyId,
      currentUser.isMaster,
      req.language,
    );
  }

  @ApiOperation({ summary: 'Exclui (soft-delete) um usuário' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'UUID do usuário a ser excluído',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário excluído com sucesso (soft-delete).',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para excluir esse usuário.',
    type: ForbiddenException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @UseGuards(JwtAuthGuard)
  @Delete('/:id')
  async delete(
    @Req() req: any,
    @Param('id') id: string,
    @User() currentUser: any,
  ) {
    if (currentUser.id === id) {
      throw new BadRequestException('Você não pode excluir a si mesmo.');
    }

    // Busca o usuário diretamente pelo ID (sem filtro de empresa)
    // Clientes (isRootUser) pertencem à própria empresa deles, não à empresa selecionada
    console.log(`[DELETE /users/:id] Buscando usuário com ID: ${id}`);
    const userToDelete = await this.usersService.findOneById(id);
    console.log(`[DELETE /users/:id] Resultado da busca:`, userToDelete ? `Usuário encontrado (isRootUser: ${userToDelete.isRootUser})` : 'Usuário NÃO encontrado');

    if (!userToDelete) {
      throw new NotFoundException(`Usuário não encontrado com ID: ${id}`);
    }

    // Se for cliente (isRootUser = true), verifica customers.delete; senão, verifica users.delete
    const requiredRule = userToDelete.isRootUser ? 'customers.delete' : 'users.delete';
    
    // Verifica se é administrador
    const isAdministrator = currentUser.isMaster || 
      currentUser.rules?.some((rule: any) => rule.rule === 'administrator') ||
      currentUser.userRoles?.some((userRole: any) =>
        userRole.role?.roleRules?.some(
          (roleRule: any) => roleRule.rule?.rule === 'administrator',
        ),
      );

    if (!isAdministrator) {
      // Verifica se tem a regra nas rules do payload primeiro
      const hasRuleInPayload = currentUser.rules?.some((rule: any) => rule.rule === requiredRule);
      
      // Se não encontrar nas rules do payload, tenta verificar em userRoles (se disponível)
      let hasPermission = hasRuleInPayload;
      
      if (!hasPermission && currentUser.userRoles) {
        const selectedCompanyId = currentUser.selectedCompany?.id;
        hasPermission = currentUser.userRoles.some((userRole: any) => {
          const roleRules = userRole.role?.roleRules || [];
          const roleDepartments = userRole.role?.roleDepartments || [];

          return roleRules.some(
            (roleRule: any) =>
              roleRule.rule?.rule === requiredRule &&
              roleDepartments.some(
                (roleDept: any) =>
                  roleDept.department?.company?.id === selectedCompanyId,
              ),
          );
        });
      }

      if (!hasPermission) {
        throw new ForbiddenException(
          `Você não tem permissão para excluir ${userToDelete.isRootUser ? 'cliente' : 'usuário'}.`,
        );
      }
    }

    const finalSelectedCompanyId = currentUser.selectedCompany.id;
    const finalIsAdministrator = currentUser.isMaster;

    return this.usersService.delete(
      id,
      finalSelectedCompanyId,
      finalIsAdministrator,
      req.language,
    );
  }

  @ApiOperation({ summary: 'Atualiza a empresa selecionada do usuário' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'UUID da nova empresa a ser selecionada',
  })
  @ApiResponse({
    status: 200,
    description: 'Empresa selecionada atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Empresa não está associada ao usuário.',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário ou empresa não encontrados.',
    type: NotFoundException,
  })
  @UseGuards(JwtAuthGuard)
  @Patch('/selected-company/:companyId')
  async updateSelectedCompany(
    @Req() req: any,
    @User('id') userId: string,
    @Param('companyId') companyId: string,
  ) {
    return this.usersService.updateSelectedCompany(
      userId,
      companyId,
      req.language,
    );
  }

  @ApiOperation({ summary: 'Retorna o perfil do usuário logado' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário retornados com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('users.getMyProfile')
  @Get('me')
  async getMyProfile(
    @Req() req: any,
    @User('id') userId: string, // Pega o ID do usuário logado via token JWT
  ) {
    return this.usersService.getMyProfile(userId, req.language);
  }

  @ApiOperation({ summary: 'Altera somente a senha do usuário logado' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiBody({
    schema: {
      properties: {
        oldPassword: { type: 'string', example: 'senhaAntiga123' },
        password: { type: 'string', example: 'senhaNova456' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Senha antiga incorreta, ou dados inválidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
  })
  @UseGuards(JwtAuthGuard, RulesGuard)
  @Rule('users.changePassword')
  @Patch('/me/change-password')
  async changePassword(
    @Req() req: any,
    @User('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      userId,
      changePasswordDto,
      req.language,
    );
  }
}
