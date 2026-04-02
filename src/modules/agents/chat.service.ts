import { Injectable, BadRequestException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AgentsService } from './agents.service';
import { OpenAIService } from './services/openai.service';
import { AgentContextService } from './services/agent-context.service';
import { AgentToolsService } from './services/agent-tools.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly agentsService: AgentsService,
    private readonly openAIService: OpenAIService,
    private readonly agentContextService: AgentContextService,
    private readonly agentToolsService: AgentToolsService,
  ) {}

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    agentId?: string,
    currentUser?: any,
  ): Promise<{ assistantMessage: string; conversationId: string; title?: string }> {
    let conversation = await this.conversationsService
      .findOne(conversationId, userId)
      .catch(() => null);

    if (!conversation && agentId) {
      conversation = await this.conversationsService.create(
        userId,
        agentId,
        content.slice(0, 100) || 'Nova conversa',
      );
    }

    if (!conversation) {
      throw new BadRequestException(
        'Conversa não encontrada ou informe agentId para criar uma nova.',
      );
    }

    if (!this.openAIService.isAvailable()) {
      throw new BadRequestException(
        'OpenAI não configurada. Defina OPENAI_API_KEY no .env.',
      );
    }

    const cid = conversation.id;
    await this.conversationsService.addMessage(cid, 'user', content);

    const history = conversation.messages || [];
    const convAgentId = conversation.agent?.id;
    const agent = convAgentId
      ? await this.agentsService.findOneWithFiles(convAgentId)
      : conversation.agent;
    if (!agent) {
      throw new BadRequestException('Agente da conversa não encontrado.');
    }
    const extraContext = currentUser
      ? await this.agentContextService.getContextForAgent(agent, currentUser)
      : '';
    const useTools = agent.scope === 'internal' && currentUser != null;
    const assistantContent = useTools
      ? await this.openAIService.chatWithTools(
          agent,
          history.map((m) => ({ role: m.role, content: m.content })),
          content,
          extraContext,
          this.agentToolsService.getToolsDefinitions(),
          (name, args) =>
            this.agentToolsService.executeTool(name, args, currentUser),
        )
      : await this.openAIService.chat(agent, history, content, extraContext);

    const saved = await this.conversationsService.addMessage(
      cid,
      'assistant',
      assistantContent,
    );

    const isFirstExchange = (conversation.messages?.length ?? 0) === 0;
    const title = isFirstExchange
      ? content.slice(0, 80) + (content.length > 80 ? '...' : '')
      : undefined;
    if (title && isFirstExchange) {
      await this.conversationsService.updateTitle(cid, userId, title);
    }

    return {
      assistantMessage: saved.content,
      conversationId: cid,
      title: title || conversation.title,
    };
  }

  /**
   * Preview: chat without persisting. Uses full message history so context is not lost.
   */
  async preview(
    userId: string,
    agentId: string,
    messages: { role: string; content: string }[],
    content: string,
    currentUser?: any,
  ): Promise<{ assistantMessage: string }> {
    if (!this.openAIService.isAvailable()) {
      throw new BadRequestException('OpenAI não configurada. Defina OPENAI_API_KEY no .env.');
    }
    const agent = await this.agentsService.findOne(agentId, userId);
    const extraContext = currentUser
      ? await this.agentContextService.getContextForAgent(agent, currentUser)
      : '';
    const useTools = agent.scope === 'internal' && currentUser != null;
    const assistantMessage = useTools
      ? await this.openAIService.chatWithTools(
          agent,
          messages,
          content,
          extraContext,
          this.agentToolsService.getToolsDefinitions(),
          (name, args) =>
            this.agentToolsService.executeTool(name, args, currentUser),
        )
      : await this.openAIService.chatFromHistory(
          agent,
          messages,
          content,
          extraContext,
        );
    return { assistantMessage };
  }

  /**
   * Gera texto de resposta para WhatsApp (sem persistir conversa de agent).
   * useTools só quando `currentUser` vier do banco (permissões reais).
   */
  async whatsAppAutoReply(
    agentId: string,
    history: { role: string; content: string }[],
    lastUserText: string,
    currentUser: any | null,
  ): Promise<string> {
    if (!this.openAIService.isAvailable()) {
      throw new BadRequestException(
        'OpenAI não configurada. Defina OPENAI_API_KEY no .env.',
      );
    }
    const agent = await this.agentsService.findOneWithFiles(agentId);
    if (!agent || !agent.isActive) {
      throw new BadRequestException('Agente não encontrado ou inativo.');
    }
    const scope = (agent.scope || 'general').toLowerCase();
    const contextUser =
      currentUser ??
      (scope === 'internal'
        ? { id: 'whatsapp-internal', isRootUser: false }
        : null);
    const extraContext = contextUser
      ? await this.agentContextService.getContextForAgent(agent, contextUser)
      : '';
    const useTools = scope === 'internal' && currentUser != null;
    if (useTools) {
      return this.openAIService.chatWithTools(
        agent,
        history,
        lastUserText,
        extraContext,
        this.agentToolsService.getToolsDefinitions(),
        (name, args) =>
          this.agentToolsService.executeTool(name, args, currentUser),
      );
    }
    return this.openAIService.chatFromHistory(
      agent,
      history,
      lastUserText,
      extraContext,
    );
  }
}
