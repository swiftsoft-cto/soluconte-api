import { Injectable, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';
import { InternalTasksService } from '../../internal-tasks/internal-tasks.service';
import { UsersService } from '../../users/users.service';
import { DepartmentsService } from '../../departments/departments.service';
import { FileManagementService } from '../../file-management/file-management.service';
import { EmailService } from '../../email/email.service';
import { TaskPriority } from '../../internal-tasks/entities/internal-task.entity';

/** User mínimo com estrutura de permissões (request.user) */
export interface UserForTools {
  id: string;
  selectedCompany?: { id: string };
  userRoles?: Array<{
    role: {
      roleRules?: Array<{ rule?: { rule: string } }>;
      roleDepartments?: Array<{
        department?: { company?: { id: string } };
      }>;
    };
  }>;
  isMaster?: boolean;
}

@Injectable()
export class AgentToolsService {
  constructor(
    private readonly internalTasksService: InternalTasksService,
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    private readonly fileManagementService: FileManagementService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Verifica se o usuário tem a regra (mesma lógica do RulesGuard).
   */
  userHasRule(user: UserForTools, ruleName: string): boolean {
    if (user.isMaster) return true;
    const hasAdministrator = user.userRoles?.some((userRole) =>
      userRole.role?.roleRules?.some((rr) => rr.rule?.rule === 'administrator'),
    );
    if (hasAdministrator) return true;
    const selectedCompanyId = user.selectedCompany?.id;
    if (!selectedCompanyId) return false;
    return (
      user.userRoles?.some((userRole) => {
        const roleRules = userRole.role?.roleRules ?? [];
        const roleDepartments = userRole.role?.roleDepartments ?? [];
        return (
          roleRules.some(
            (rr) =>
              rr.rule?.rule === ruleName &&
              roleDepartments.some(
                (rd) =>
                  rd.department?.company?.id === selectedCompanyId,
              ),
          )
        );
      }) ?? false
    );
  }

  getToolsDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'list_departments',
          description:
            'Lista os departamentos da empresa do usuário. Use para obter departmentId ao criar tarefas.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_kanbans_with_columns',
          description:
            'Lista os quadros Kanban e suas colunas. Use para obter kanbanId e columnId ao criar tarefas de projeto.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_internal_task',
          description:
            'Cria uma tarefa de projeto interno. Requer título, departamento, quadro e coluna. O usuário deve ter permissão internal-tasks.create.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Título da tarefa' },
              description: { type: 'string', description: 'Descrição opcional' },
              priority: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                description: 'Prioridade (padrão MEDIUM)',
              },
              departmentId: { type: 'string', description: 'ID do departamento' },
              kanbanId: { type: 'string', description: 'ID do quadro Kanban' },
              columnId: { type: 'string', description: 'ID da coluna do quadro' },
              dueDate: { type: 'string', description: 'Data de vencimento (ISO 8601)' },
              responsibleId: { type: 'string', description: 'ID do responsável (usuário)' },
              customerId: { type: 'string', description: 'ID do cliente (empresa) opcional' },
            },
            required: ['title', 'departmentId', 'kanbanId', 'columnId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_client',
          description:
            'Cadastra um novo cliente (empresa + usuário proprietário). Requer nome da empresa e CNPJ. O usuário deve ter permissão customers.create.',
          parameters: {
            type: 'object',
            properties: {
              companyName: { type: 'string', description: 'Nome da empresa / razão social' },
              document: { type: 'string', description: 'CNPJ da empresa (apenas números)' },
              name: { type: 'string', description: 'Nome do representante' },
              lastName: { type: 'string', description: 'Sobrenome do representante' },
              email: { type: 'string', description: 'E-mail do representante' },
              password: { type: 'string', description: 'Senha (mínimo 6 caracteres)' },
              phone: { type: 'string', description: 'Telefone' },
            },
            required: ['companyName', 'document'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_communication_targets',
          description:
            'Lista os grupos WhatsApp configurados para notificações (por cliente/departamento). Use para saber para quais grupos pode enviar mensagens. Opcionalmente filtre por departmentId (ID do departamento Soluconte) ou "geral" para grupos sem departamento.',
          parameters: {
            type: 'object',
            properties: {
              departmentId: {
                type: 'string',
                description:
                  'Opcional. ID do departamento para filtrar, ou "geral" para grupos sem departamento. Omitir lista todos os grupos.',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_communication_message',
          description:
            'Envia uma mensagem de texto personalizada para os grupos WhatsApp configurados nas notificações. Pode enviar para todos os grupos ou apenas para os de um departamento. O usuário deve ter permissão file-management.upload.',
          parameters: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Texto da mensagem a ser enviada (até 4096 caracteres)',
              },
              departmentId: {
                type: 'string',
                description:
                  'Opcional. Se informado, envia apenas para grupos daquele departamento. Use "geral" para grupos sem departamento. Omitir envia para todos os grupos.',
              },
            },
            required: ['message'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_email',
          description:
            'Envia um e-mail para um destinatário. Use para enviar acesso à plataforma, boas-vindas ou outras mensagens. Requer to (e-mail), subject (assunto) e body (corpo da mensagem). O usuário deve ter permissão file-management.upload.',
          parameters: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Endereço de e-mail do destinatário',
              },
              subject: {
                type: 'string',
                description: 'Assunto do e-mail',
              },
              body: {
                type: 'string',
                description: 'Corpo da mensagem (pode usar texto ou HTML simples)',
              },
              isHtml: {
                type: 'boolean',
                description: 'Se true, body é interpretado como HTML; senão, texto plano (padrão true)',
              },
            },
            required: ['to', 'subject', 'body'],
          },
        },
      },
    ];
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    user: UserForTools,
  ): Promise<string> {
    let userWithRelations = user;
    if (!user.userRoles?.length && user.id) {
      try {
        const loaded = await this.usersService.findOneWithRelations(user.id);
        if (loaded) userWithRelations = loaded as unknown as UserForTools;
      } catch {
        // keep original user
      }
    }
    try {
      if (toolName === 'list_departments') {
        return this.runListDepartments(userWithRelations);
      }
      if (toolName === 'list_kanbans_with_columns') {
        return this.runListKanbans(userWithRelations);
      }
      if (toolName === 'create_internal_task') {
        return this.runCreateTask(args, userWithRelations);
      }
      if (toolName === 'create_client') {
        return this.runCreateClient(args, userWithRelations);
      }
      if (toolName === 'list_communication_targets') {
        return this.runListCommunicationTargets(args, userWithRelations);
      }
      if (toolName === 'send_communication_message') {
        return this.runSendCommunicationMessage(args, userWithRelations);
      }
      if (toolName === 'send_email') {
        return this.runSendEmail(args, userWithRelations);
      }
      return JSON.stringify({ error: `Ferramenta desconhecida: ${toolName}` });
    } catch (err: any) {
      const message = err?.message || err?.response?.message || String(err);
      return JSON.stringify({ error: message, success: false });
    }
  }

  private async runListDepartments(user: UserForTools): Promise<string> {
    const companyId = user.selectedCompany?.id;
    if (!companyId) {
      return JSON.stringify({ error: 'Nenhuma empresa selecionada.', departments: [] });
    }
    const list = await this.departmentsService.findAllByCompany(companyId);
    const departments = (list || []).map((d: any) => ({ id: d.id, name: d.name }));
    return JSON.stringify({ departments });
  }

  private async runListKanbans(user: UserForTools): Promise<string> {
    const kanbans = await this.internalTasksService.findAllKanbans(user as any);
    const data = (kanbans || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      columns: (k.columns || []).map((c: any) => ({ id: c.id, name: c.name })),
    }));
    return JSON.stringify({ kanbans: data });
  }

  private async runCreateTask(
    args: Record<string, unknown>,
    user: UserForTools,
  ): Promise<string> {
    if (!this.userHasRule(user, 'internal-tasks.create')) {
      throw new ForbiddenException(
        'Você não tem permissão para criar tarefas. É necessária a regra internal-tasks.create.',
      );
    }
    const priority = (args.priority as string) || 'MEDIUM';
    if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      return JSON.stringify({ error: 'Prioridade deve ser LOW, MEDIUM, HIGH ou URGENT.' });
    }
    const dto = {
      title: String(args.title),
      description: args.description ? String(args.description) : undefined,
      priority: priority as TaskPriority,
      departmentId: String(args.departmentId),
      kanbanId: String(args.kanbanId),
      columnId: String(args.columnId),
      dueDate: args.dueDate ? String(args.dueDate) : undefined,
      responsibleId: args.responsibleId ? String(args.responsibleId) : undefined,
      customerId: args.customerId ? String(args.customerId) : undefined,
    };
    const task = await this.internalTasksService.createTask(dto as any, user as any);
    return JSON.stringify({
      success: true,
      message: 'Tarefa criada com sucesso.',
      taskId: task.id,
      title: task.title,
    });
  }

  private async runCreateClient(
    args: Record<string, unknown>,
    user: UserForTools,
  ): Promise<string> {
    if (!this.userHasRule(user, 'customers.create')) {
      throw new ForbiddenException(
        'Você não tem permissão para cadastrar clientes. É necessária a regra customers.create.',
      );
    }
    const document = String(args.document || '').replace(/\D/g, '');
    if (document.length !== 14) {
      return JSON.stringify({ error: 'CNPJ deve ter 14 dígitos (apenas números).' });
    }
    const dto = {
      companyName: String(args.companyName),
      document,
      name: args.name ? String(args.name) : 'Sem nome',
      lastName: args.lastName ? String(args.lastName) : '',
      email: args.email ? String(args.email) : undefined,
      password: args.password ? String(args.password) : undefined,
      phone: args.phone ? String(args.phone) : undefined,
    };
    const result = await this.usersService.createOwner(dto as any, 'pt-BR');
    const data = result?.data;
    const company = data?.company;
    const createdUser = data?.user;
    return JSON.stringify({
      success: true,
      message: 'Cliente cadastrado com sucesso.',
      companyId: company?.id,
      userId: createdUser?.id,
    });
  }

  private async runListCommunicationTargets(
    args: Record<string, unknown>,
    user: UserForTools,
  ): Promise<string> {
    const departmentId = args.departmentId !== undefined && args.departmentId !== null
      ? String(args.departmentId)
      : undefined;
    const list = await this.fileManagementService.getCommunicationTargets(
      departmentId,
      user as any,
    );
    return JSON.stringify({
      targets: list,
      total: list.length,
      description:
        departmentId == null
          ? 'Todos os grupos configurados'
          : departmentId === 'geral' || departmentId === ''
            ? 'Grupos configurados como Geral (sem departamento)'
            : `Grupos do departamento ${departmentId}`,
    });
  }

  private async runSendCommunicationMessage(
    args: Record<string, unknown>,
    user: UserForTools,
  ): Promise<string> {
    if (!this.userHasRule(user, 'file-management.upload')) {
      throw new ForbiddenException(
        'Você não tem permissão para enviar mensagens de comunicação. É necessária a regra file-management.upload.',
      );
    }
    const message = typeof args.message === 'string' ? args.message.trim() : '';
    if (!message) {
      return JSON.stringify({ error: 'A mensagem é obrigatória.', success: false });
    }
    if (message.length > 4096) {
      return JSON.stringify({
        error: 'A mensagem pode ter no máximo 4096 caracteres.',
        success: false,
      });
    }
    const departmentId = args.departmentId !== undefined && args.departmentId !== null
      ? String(args.departmentId)
      : undefined;
    const result = await this.fileManagementService.sendCommunicationMessage(
      message,
      departmentId,
      user as any,
    );
    return JSON.stringify({
      success: true,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
      message:
        result.failed === 0
          ? `Mensagem enviada com sucesso para ${result.sent} grupo(s).`
          : `Enviado para ${result.sent} grupo(s). Falha em ${result.failed} grupo(s).`,
    });
  }

  private async runSendEmail(
    args: Record<string, unknown>,
    user: UserForTools,
  ): Promise<string> {
    if (!this.userHasRule(user, 'file-management.upload')) {
      throw new ForbiddenException(
        'Você não tem permissão para enviar e-mails. É necessária a regra file-management.upload.',
      );
    }
    const to = typeof args.to === 'string' ? args.to.trim() : '';
    const subject = typeof args.subject === 'string' ? args.subject.trim() : '';
    const body = typeof args.body === 'string' ? args.body.trim() : '';
    if (!to) {
      return JSON.stringify({ error: 'O destinatário (to) é obrigatório.', success: false });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return JSON.stringify({ error: 'Informe um e-mail válido para o destinatário.', success: false });
    }
    if (!subject) {
      return JSON.stringify({ error: 'O assunto (subject) é obrigatório.', success: false });
    }
    if (!body) {
      return JSON.stringify({ error: 'O corpo da mensagem (body) é obrigatório.', success: false });
    }
    const isHtml = args.isHtml !== false;
    try {
      const result = await this.emailService.sendEmail(to, subject, body, isHtml);
      return JSON.stringify({
        success: true,
        messageId: result.messageId,
        message: `E-mail enviado com sucesso para ${to}.`,
      });
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Erro ao enviar e-mail.';
      return JSON.stringify({ error: msg, success: false });
    }
  }
}
