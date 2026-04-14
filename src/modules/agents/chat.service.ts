import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AgentsService } from './agents.service';
import { OpenAIService } from './services/openai.service';
import { AgentContextService } from './services/agent-context.service';
import { AgentToolsService } from './services/agent-tools.service';
import {
  AIFallbackService,
  AIFallbackResult,
  AIUnavailableError,
} from './services/ai-fallback.service';

export interface ChatSendResult {
  assistantMessage: string;
  conversationId: string;
  title?: string;
  fallback?: boolean;
  reason?: string;
}

export interface WhatsAppAutoReplyResult {
  text: string;
  fallback: boolean;
  reason?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly agentsService: AgentsService,
    private readonly openAIService: OpenAIService,
    private readonly agentContextService: AgentContextService,
    private readonly agentToolsService: AgentToolsService,
    private readonly aiFallbackService: AIFallbackService,
  ) {}

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    agentId?: string,
    currentUser?: any,
  ): Promise<ChatSendResult> {
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

    let assistantContent: string;
    let fallback: AIFallbackResult | null = null;

    if (!this.openAIService.isAvailable()) {
      fallback = this.aiFallbackService.build(agent.scope, 'openai_not_configured');
      assistantContent = fallback.text;
    } else {
      const extraContext = currentUser
        ? await this.agentContextService.getContextForAgent(agent, currentUser)
        : '';
      const useTools = agent.scope === 'internal' && currentUser != null;
      try {
        assistantContent = useTools
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
      } catch (err) {
        const reason =
          err instanceof AIUnavailableError ? err.reason : 'openai_error';
        this.logger.error(
          `Falha na chamada à OpenAI (conversa ${cid}): ${(err as Error)?.message}`,
          (err as Error)?.stack,
        );
        fallback = this.aiFallbackService.build(agent.scope, reason, err);
        assistantContent = fallback.text;
      }
    }

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
      ...(fallback
        ? { fallback: true, reason: fallback.reason }
        : {}),
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
  ): Promise<{ assistantMessage: string; fallback?: boolean; reason?: string }> {
    const agent = await this.agentsService.findOne(agentId, userId);

    if (!this.openAIService.isAvailable()) {
      const fb = this.aiFallbackService.build(agent.scope, 'openai_not_configured');
      return { assistantMessage: fb.text, fallback: true, reason: fb.reason };
    }

    const extraContext = currentUser
      ? await this.agentContextService.getContextForAgent(agent, currentUser)
      : '';
    const useTools = agent.scope === 'internal' && currentUser != null;
    try {
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
    } catch (err) {
      const reason =
        err instanceof AIUnavailableError ? err.reason : 'openai_error';
      this.logger.error(
        `Falha no preview do agente ${agentId}: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      const fb = this.aiFallbackService.build(agent.scope, reason, err);
      return { assistantMessage: fb.text, fallback: true, reason: fb.reason };
    }
  }

  /**
   * Gera texto de resposta para WhatsApp (sem persistir conversa de agent).
   * Nunca lança exceção: retorna um objeto com `fallback=true` se a IA
   * estiver indisponível ou falhar. O chamador decide o que fazer com a mensagem.
   */
  async whatsAppAutoReply(
    agentId: string,
    history: { role: string; content: string }[],
    lastUserText: string,
    currentUser: any | null,
  ): Promise<WhatsAppAutoReplyResult> {
    const agent = await this.agentsService.findOneWithFiles(agentId);
    if (!agent || !agent.isActive) {
      const fb = this.aiFallbackService.build(
        agent?.scope ?? 'general',
        'agent_inactive',
      );
      return { text: fb.text, fallback: true, reason: fb.reason };
    }

    if (!this.openAIService.isAvailable()) {
      const fb = this.aiFallbackService.build(agent.scope, 'openai_not_configured');
      return { text: fb.text, fallback: true, reason: fb.reason };
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

    try {
      const text = useTools
        ? await this.openAIService.chatWithTools(
            agent,
            history,
            lastUserText,
            extraContext,
            this.agentToolsService.getToolsDefinitions(),
            (name, args) =>
              this.agentToolsService.executeTool(name, args, currentUser),
          )
        : await this.openAIService.chatFromHistory(
            agent,
            history,
            lastUserText,
            extraContext,
          );
      const trimmed = (text ?? '').trim();
      if (!trimmed) {
        const fb = this.aiFallbackService.build(agent.scope, 'empty_response');
        return { text: fb.text, fallback: true, reason: fb.reason };
      }
      return { text: trimmed, fallback: false };
    } catch (err) {
      const reason =
        err instanceof AIUnavailableError ? err.reason : 'openai_error';
      this.logger.error(
        `whatsAppAutoReply falhou (agent ${agentId}): ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      const fb = this.aiFallbackService.build(agent.scope, reason, err);
      return { text: fb.text, fallback: true, reason: fb.reason };
    }
  }
}
