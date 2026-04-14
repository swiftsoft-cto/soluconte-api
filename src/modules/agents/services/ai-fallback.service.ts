import { Injectable, Logger } from '@nestjs/common';

/**
 * Motivos pelos quais uma resposta de IA pode ter sido substituída pelo fallback.
 */
export type AIFallbackReason =
  | 'openai_not_configured'
  | 'openai_error'
  | 'agent_inactive'
  | 'empty_response';

export interface AIFallbackResult {
  /** Texto que será mostrado / enviado ao usuário final. */
  text: string;
  /** Indica que a resposta veio do fallback (não da IA). */
  fallback: true;
  reason: AIFallbackReason;
}

/**
 * Erro customizado disparado quando a chamada à OpenAI falha ou não está disponível.
 * Usado pelos callers para distinguir falhas de IA de erros de negócio (validação etc.).
 */
export class AIUnavailableError extends Error {
  readonly reason: AIFallbackReason;
  constructor(reason: AIFallbackReason, message?: string) {
    super(message ?? reason);
    this.name = 'AIUnavailableError';
    this.reason = reason;
  }
}

/**
 * Fornece mensagens padrão quando a OpenAI (ou outra camada de IA) está indisponível
 * ou retorna erro. Escopos suportados: general, client, internal.
 *
 * As mensagens podem ser sobrescritas via variáveis de ambiente:
 *   AI_FALLBACK_MESSAGE_GENERAL
 *   AI_FALLBACK_MESSAGE_CLIENT
 *   AI_FALLBACK_MESSAGE_INTERNAL
 */
@Injectable()
export class AIFallbackService {
  private readonly logger = new Logger(AIFallbackService.name);

  private readonly defaults: Record<string, string> = {
    general:
      'No momento não consegui gerar uma resposta automática. Tente novamente em instantes — se o problema persistir, um atendente será notificado.',
    client:
      'No momento não consegui gerar uma resposta automática. Nossa equipe foi notificada e entrará em contato em breve.',
    internal:
      'Não foi possível executar a ação pela IA agora (serviço indisponível). Tente novamente em alguns minutos ou execute manualmente pelo sistema.',
  };

  /**
   * Retorna a mensagem de fallback adequada ao escopo do agente.
   */
  getMessage(scope: string | undefined | null): string {
    const key = (scope || 'general').toLowerCase();
    const envKey = `AI_FALLBACK_MESSAGE_${key.toUpperCase()}`;
    const fromEnv = process.env[envKey];
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
    return this.defaults[key] ?? this.defaults.general;
  }

  /**
   * Monta um resultado estruturado para que o caller possa tanto devolver ao usuário
   * quanto decidir se deve notificar o operador.
   */
  build(
    scope: string | undefined | null,
    reason: AIFallbackReason,
    cause?: unknown,
  ): AIFallbackResult {
    const err = cause as Error | undefined;
    this.logger.warn(
      `AI fallback acionado (scope=${scope ?? 'general'}, reason=${reason})${
        err?.message ? `: ${err.message}` : ''
      }`,
    );
    return {
      text: this.getMessage(scope),
      fallback: true,
      reason,
    };
  }
}
