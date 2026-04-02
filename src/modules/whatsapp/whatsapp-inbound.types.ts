/** Contrato da mensagem 1:1 persistida (texto) — usado pelo cliente web.js e pelo serviço de threads. */
export type WhatsAppInboundPayload = {
  /** Dispositivo (linha) que recebeu a mensagem; se ausente, usa o dispositivo padrão (legado). */
  deviceId?: string;
  waChatId: string;
  body: string;
  waMessageId?: string;
  contactName?: string;
};
