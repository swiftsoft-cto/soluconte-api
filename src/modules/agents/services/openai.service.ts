import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Agent } from '../entities/agent.entity';
import { Message } from '../entities/message.entity';
import { AgentFile } from '../entities/agent-file.entity';
import { AIUnavailableError } from './ai-fallback.service';

/** Max messages to send as context to stay within token limits */
const MAX_CONTEXT_MESSAGES = 30;

const EMBEDDING_MODEL = 'text-embedding-3-small';
const RAG_TOP_K = 5;

@Injectable()
export class OpenAIService {
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (apiKey && apiKey !== 'jdjd') {
      this.client = new OpenAI({ apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Create embedding vector for text (for RAG).
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!this.client || !text?.trim()) return [];
    const truncated = text.trim().slice(0, 8000);
    const res = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });
    const vec = res.data?.[0]?.embedding;
    return Array.isArray(vec) ? vec : [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const den = Math.sqrt(normA) * Math.sqrt(normB);
    return den === 0 ? 0 : dot / den;
  }

  /**
   * Build system message: nome, descrição, instruções e conhecimento (arquivos).
   * Se userQuery for passada e os arquivos tiverem embedding, usa RAG (top-k). Senão injeta todo o conteúdo.
   */
  async buildSystemMessage(agent: Agent, userQuery?: string): Promise<string> {
    const parts: string[] = [];
    if (agent.name?.trim()) {
      parts.push(`Você é o agente "${agent.name.trim()}". Responda sempre no papel desse agente e use o contexto abaixo.`);
    }
    if (agent.description?.trim()) {
      parts.push(`Descrição do seu papel: ${agent.description.trim()}`);
    }
    if (agent.instructions?.trim()) {
      parts.push(`Instruções que você deve seguir:\n${agent.instructions.trim()}`);
    }

    const filesWithContent = (agent.files || []).filter((f) => f.contentText?.trim());
    if (filesWithContent.length === 0) {
      return parts.length ? parts.join('\n\n') : 'Você é um assistente prestativo.';
    }

    const filesWithEmbedding = filesWithContent.filter((f) => f.embedding && Array.isArray(f.embedding) && f.embedding.length > 0);

    if (userQuery && userQuery.trim() && filesWithEmbedding.length > 0 && this.client) {
      try {
        const queryEmbedding = await this.createEmbedding(userQuery);
        if (queryEmbedding.length > 0) {
          const scored = filesWithEmbedding
            .map((f) => ({
              file: f,
              score: this.cosineSimilarity(queryEmbedding, f.embedding!),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, RAG_TOP_K);
          const knowledge = scored
            .map((s) => `--- ${s.file.fileName} ---\n${s.file.contentText!.trim()}`)
            .join('\n\n');
          if (knowledge) {
            parts.push('Conhecimento relevante (use para enriquecer sua resposta):\n' + knowledge);
          }
          return parts.length ? parts.join('\n\n') : 'Você é um assistente prestativo.';
        }
      } catch {
        // fallback to all content
      }
    }

    const knowledge = filesWithContent
      .map((f) => `--- Arquivo: ${f.fileName} ---\n${f.contentText!.trim()}`)
      .join('\n\n');
    parts.push('Conhecimento adicional (use para enriquecer suas respostas quando relevante):\n' + knowledge);
    return parts.join('\n\n');
  }

  /**
   * Build messages array: system + last N history + user message.
   */
  buildMessages(
    systemContent: string,
    history: Message[],
    userContent: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
    ];
    const recent = history.slice(-MAX_CONTEXT_MESSAGES);
    for (const m of recent) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
      }
    }
    messages.push({ role: 'user', content: userContent });
    return messages;
  }

  /**
   * Build messages from a generic history (e.g. for preview).
   */
  buildMessagesFromHistory(
    systemContent: string,
    history: { role: string; content: string }[],
    userContent: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
    ];
    const recent = history.slice(-MAX_CONTEXT_MESSAGES);
    for (const m of recent) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
      }
    }
    messages.push({ role: 'user', content: userContent });
    return messages;
  }

  /**
   * Chat with persisted conversation (saves context in DB).
   * extraContext: contexto por escopo (cliente, interno) injetado pelo AgentContextService.
   */
  async chat(
    agent: Agent,
    history: Message[],
    userContent: string,
    extraContext?: string,
  ): Promise<string> {
    if (!this.client) {
      throw new AIUnavailableError(
        'openai_not_configured',
        'OpenAI não configurada. Defina OPENAI_API_KEY no .env.',
      );
    }
    let systemContent = await this.buildSystemMessage(agent, userContent);
    if (extraContext?.trim()) {
      systemContent = extraContext.trim() + '\n\n' + systemContent;
    }
    const messages = this.buildMessages(systemContent, history, userContent);
    const model = agent.recommendedModel?.trim() || this.model;
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    });
    const choice = completion.choices?.[0];
    if (!choice?.message?.content) {
      throw new AIUnavailableError('empty_response', 'Resposta vazia da OpenAI.');
    }
    return choice.message.content;
  }

  /**
   * Chat from in-memory history (for preview). Keeps full context.
   */
  async chatFromHistory(
    agent: Agent,
    history: { role: string; content: string }[],
    userContent: string,
    extraContext?: string,
  ): Promise<string> {
    if (!this.client) {
      throw new AIUnavailableError(
        'openai_not_configured',
        'OpenAI não configurada. Defina OPENAI_API_KEY no .env.',
      );
    }
    let systemContent = await this.buildSystemMessage(agent, userContent);
    if (extraContext?.trim()) {
      systemContent = extraContext.trim() + '\n\n' + systemContent;
    }
    const messages = this.buildMessagesFromHistory(systemContent, history, userContent);
    const model = agent.recommendedModel?.trim() || this.model;
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    });
    const choice = completion.choices?.[0];
    if (!choice?.message?.content) {
      throw new AIUnavailableError('empty_response', 'Resposta vazia da OpenAI.');
    }
    return choice.message.content;
  }

  /**
   * Chat with tools (function calling). Used for internal agent to execute actions.
   * executeTool: (toolName, args) => Promise<string>
   * Loops until the model returns a final text response (no tool_calls) or max iterations.
   */
  async chatWithTools(
    agent: Agent,
    history: { role: string; content: string }[],
    userContent: string,
    extraContext: string | undefined,
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    executeTool: (toolName: string, args: Record<string, unknown>) => Promise<string>,
  ): Promise<string> {
    if (!this.client) {
      throw new AIUnavailableError(
        'openai_not_configured',
        'OpenAI não configurada. Defina OPENAI_API_KEY no .env.',
      );
    }
    let systemContent = await this.buildSystemMessage(agent, userContent);
    if (extraContext?.trim()) {
      systemContent = extraContext.trim() + '\n\n' + systemContent;
    }
    const model = agent.recommendedModel?.trim() || this.model;
    let messages = this.buildMessagesFromHistory(systemContent, history, userContent);
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 4096,
      });

      const choice = completion.choices?.[0];
      const msg = choice?.message;
      if (!msg) {
        throw new AIUnavailableError('empty_response', 'Resposta vazia da OpenAI.');
      }

      messages.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      } as OpenAI.Chat.ChatCompletionAssistantMessageParam);

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return (msg.content as string) || 'Ação concluída.';
      }

      for (const tc of msg.tool_calls) {
        const name = tc.function?.name ?? '';
        let args: Record<string, unknown> = {};
        try {
          if (tc.function?.arguments) {
            args = JSON.parse(tc.function.arguments);
          }
        } catch {
          args = {};
        }
        const result = await executeTool(name, args);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    throw new AIUnavailableError(
      'openai_error',
      'Limite de iterações de ferramentas atingido.',
    );
  }
}
