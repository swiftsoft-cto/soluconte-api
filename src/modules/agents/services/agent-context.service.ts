import { Injectable } from '@nestjs/common';
import { Agent } from '../entities/agent.entity';
import { CompaniesService } from '../../companies/companies.service';
import { FileManagementService } from '../../file-management/file-management.service';

/** Objeto usuário mínimo para permissões (compatível com request.user) */
export interface CurrentUserForContext {
  id: string;
  isRootUser?: boolean;
  selectedCompany?: { id: string };
}

@Injectable()
export class AgentContextService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly fileManagementService: FileManagementService,
  ) {}

  /**
   * Monta o contexto extra do system message conforme o escopo do agente.
   * - client: dados da empresa vinculada + estrutura de documentos; instrução de não falar de outros clientes.
   * - internal: instrução de que o agente entende o sistema e pode ajudar com CRUD (ações futuras).
   * - general: retorna vazio.
   */
  async getContextForAgent(
    agent: Agent,
    currentUser: CurrentUserForContext,
  ): Promise<string> {
    const scope = (agent.scope || 'general').toLowerCase();

    if (scope === 'general') {
      return '';
    }

    if (scope === 'client') {
      const companyId = agent.linkedClient?.id;
      if (!companyId) {
        return 'Este agente está configurado para um cliente específico, mas nenhum cliente foi vinculado. Informe apenas que você não tem acesso a dados de cliente no momento.';
      }
      try {
        const company = await this.companiesService.findOne(companyId);
        const folderStructure = await this.fileManagementService.getFolderStructure(
          companyId,
          currentUser as any,
        );
        const companySummary = this.formatCompanySummary(company);
        const docsSummary = this.formatFolderStructure(folderStructure);

        // Lista de arquivos dentro das pastas do cliente (ano/mês) para o agente poder listar e falar sobre eles
        let filesSummary = '';
        try {
          const files = await this.fileManagementService.listFiles(
            { companyId },
            currentUser as any,
          );
          filesSummary = this.formatClientFilesList(files);
        } catch {
          filesSummary = 'Não foi possível carregar a lista de arquivos no momento.';
        }

        return (
          '--- CONTEXTO EXCLUSIVO DO CLIENTE (não use informações de outros clientes) ---\n\n' +
          'Dados da empresa deste cliente:\n' +
          companySummary +
          '\n\nEstrutura de pastas (departamento → ano/mês) do cliente:\n' +
          docsSummary +
          '\n\nArquivos disponíveis nas pastas do cliente (liste e fale sobre eles quando o usuário perguntar):\n' +
          filesSummary +
          '\n\nRegra obrigatória: Você só pode usar e mencionar informações desta empresa. Nunca revele, cite ou discuta dados de outras empresas ou clientes. Se perguntarem sobre outros clientes, diga que não tem acesso a essas informações.'
        );
      } catch {
        return `Este agente está vinculado a um cliente (ID: ${companyId}), mas não foi possível carregar os dados no momento. Responda apenas com base nas instruções e no conhecimento anexado; não invente dados do cliente.`;
      }
    }

    if (scope === 'internal') {
      return (
        '--- MODO INTERNO ---\n\n' +
        'Você atua como assistente interno do sistema. Você entende o funcionamento da aplicação: cadastro de clientes (empresas), usuários, tarefas de projetos, documentos por cliente, etc.\n' +
        'Você tem ferramentas (tools) para executar ações reais:\n' +
        '- list_departments: listar departamentos da empresa (use antes de criar tarefa, para obter departmentId).\n' +
        '- list_kanbans_with_columns: listar quadros Kanban e colunas (use para obter kanbanId e columnId ao criar tarefa).\n' +
        '- create_internal_task: criar uma tarefa de projeto (título, prioridade, departmentId, kanbanId, columnId obrigatórios). A permissão do usuário é verificada automaticamente.\n' +
        '- create_client: cadastrar um novo cliente (empresa + proprietário). Requer companyName e document (CNPJ 14 dígitos). A permissão do usuário é verificada automaticamente.\n' +
        '- list_communication_targets: listar grupos WhatsApp configurados para notificações (opcional departmentId ou "geral"). Use para saber para quais grupos pode enviar mensagens.\n' +
        '- send_communication_message: enviar mensagem de texto personalizada para os grupos WhatsApp. Requer message (texto). Opcional departmentId para enviar só ao departamento pedido; omitir envia para todos. Exige permissão file-management.upload.\n' +
        '- send_email: enviar e-mail para um destinatário. Requer to (e-mail), subject (assunto) e body (corpo da mensagem). Use para enviar acesso à plataforma, boas-vindas ou outras mensagens. Exige permissão file-management.upload.\n' +
        'Quando o usuário pedir para criar uma tarefa ou cadastrar um cliente, use as ferramentas na ordem adequada: liste departamentos/kanbans se precisar de IDs, depois chame create_internal_task ou create_client com os dados fornecidos. Se faltar algum dado obrigatório, peça ao usuário antes de chamar a ferramenta. Se o usuário não tiver permissão, a ferramenta retornará erro; informe isso de forma clara.\n' +
        'Quando pedir envio de notificação/mensagem para grupos WhatsApp (ex.: departamento Pedido), use list_communication_targets e depois send_communication_message com a mensagem e, se for o caso, o departmentId.\n' +
        'Quando pedir envio de e-mail (ex.: enviar acesso ao cliente, boas-vindas), use send_email com to (e-mail do destinatário), subject e body (conteúdo da mensagem).'
      );
    }

    return '';
  }

  private formatCompanySummary(company: any): string {
    const parts: string[] = [];
    if (company.businessName) parts.push(`Razão social: ${company.businessName}`);
    if (company.name) parts.push(`Nome: ${company.name}`);
    if (company.cnpj) parts.push(`CNPJ: ${company.cnpj}`);
    if (company.email) parts.push(`E-mail: ${company.email}`);
    if (company.phone) parts.push(`Telefone: ${company.phone}`);
    if (company.address) parts.push(`Endereço: ${company.address}`);
    if (company.city) parts.push(`Cidade: ${company.city}`);
    if (company.state) parts.push(`Estado: ${company.state}`);
    return parts.length ? parts.join('\n') : 'Sem dados cadastrais.';
  }

  private formatFolderStructure(structure: any): string {
    if (!structure) return 'Nenhum documento listado.';
    if (Array.isArray(structure)) {
      return structure.map((s) => this.formatOneStructure(s)).join('\n');
    }
    return this.formatOneStructure(structure);
  }

  private formatOneStructure(s: {
    companyId: string;
    companyName: string;
    departments?: Array<{
      departmentId: string | null;
      departmentName: string;
      years: Array<{ year: number; months: number[] }>;
    }>;
    years?: Array<{ year: number; months: number[] }>;
  }): string {
    const companyLabel = s.companyName || s.companyId;
    const departments = s.departments ?? (s.years ? [{ departmentId: null, departmentName: 'Geral', years: s.years }] : []);
    if (departments.length === 0) return `${companyLabel}: nenhum documento.`;
    const deptBlocks = departments.map((d) => {
      const years = d.years || [];
      if (years.length === 0) return `  ${d.departmentName}: nenhum documento.`;
      const yearLines = years.map(
        (y) => `    ${y.year}: meses ${(y.months || []).join(', ')}`,
      );
      return `  ${d.departmentName}:\n${yearLines.join('\n')}`;
    });
    return `${companyLabel}:\n${deptBlocks.join('\n')}`;
  }

  /**
   * Formata a lista de arquivos do cliente (departamento, nome, ano/mês, descrição) para o agente.
   */
  private formatClientFilesList(files: Array<{
    originalName?: string;
    year?: number;
    month?: number;
    description?: string;
    department?: { name?: string } | null;
  }>): string {
    if (!files?.length) return 'Nenhum arquivo disponível no momento.';
    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const lines = files.map((f) => {
      const name = f.originalName || 'arquivo';
      const dept = f.department?.name ? `[${f.department.name}] ` : '';
      const period = f.year != null && f.month != null ? `${f.year}/${String(f.month).padStart(2, '0')} (${monthNames[f.month] || f.month})` : '';
      const desc = f.description?.trim() ? ` - ${f.description}` : '';
      return `  - ${dept}${period ? period + ' - ' : ''}${name}${desc}`;
    });
    return lines.join('\n');
  }
}
