import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, Message } from 'whatsapp-web.js';
import { WhatsAppDevice } from './entities/whatsapp-device.entity';
import { WhatsAppDeviceSession } from './whatsapp-device-session';
import type { WhatsAppInboundPayload } from './whatsapp-inbound.types';
import { sendDisconnectionToUsers, sendStatusToUsers } from '../../websocket/ws/whatsapp.websocket';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private inboundMessageHandler:
    | ((payload: WhatsAppInboundPayload) => Promise<void>)
    | null = null;

  private readonly sessions = new Map<string, WhatsAppDeviceSession>();
  /** Evita duas operações Puppeteer no mesmo userDataDir (mesmo deviceId). */
  private readonly deviceOpChain = new Map<string, Promise<unknown>>();
  private cachedDefaultDeviceId: string | null = null;

  private enqueueDeviceOp<T>(deviceId: string, op: () => Promise<T>): Promise<T> {
    const prev = this.deviceOpChain.get(deviceId) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(() => op());
    this.deviceOpChain.set(
      deviceId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  constructor(
    @InjectRepository(WhatsAppDevice)
    private readonly deviceRepo: Repository<WhatsAppDevice>,
  ) {}

  setInboundMessageHandler(
    handler: (payload: WhatsAppInboundPayload) => Promise<void>,
  ) {
    this.inboundMessageHandler = handler;
  }

  private createSession(deviceId: string): WhatsAppDeviceSession {
    return new WhatsAppDeviceSession(
      deviceId,
      this.logger,
      async (p) => this.inboundMessageHandler?.(p),
      (id) => {
        void this.reinitializeDevice(id, true).catch((e) =>
          this.logger.error(`[WA ${id}] reinit forçado falhou`, e),
        );
      },
    );
  }

  private getOrCreateSession(deviceId: string): WhatsAppDeviceSession {
    let s = this.sessions.get(deviceId);
    if (!s) {
      s = this.createSession(deviceId);
      this.sessions.set(deviceId, s);
    }
    return s;
  }

  /** Recarrega cache do dispositivo marcado como padrão (para legacy getStatus / notificações). */
  async refreshDefaultDeviceIdCache(): Promise<void> {
    const d = await this.deviceRepo.findOne({ where: { isDefault: true } });
    this.cachedDefaultDeviceId = d?.id ?? null;
  }

  private async requireDefaultDeviceId(): Promise<string> {
    await this.refreshDefaultDeviceIdCache();
    if (!this.cachedDefaultDeviceId) {
      throw new Error('Nenhum dispositivo WhatsApp padrão cadastrado.');
    }
    return this.cachedDefaultDeviceId;
  }

  /**
   * Garante que o cliente web.js deste deviceId está inicializando ou pronto.
   */
  async startDeviceSession(deviceId: string): Promise<void> {
    const exists = await this.deviceRepo.exist({ where: { id: deviceId } });
    if (!exists) {
      throw new NotFoundException('Dispositivo não encontrado');
    }
    await this.enqueueDeviceOp(deviceId, async () => {
      const s = this.getOrCreateSession(deviceId);
      await s.initialize();
    });
  }

  getDeviceSessionStatus(deviceId: string): {
    isReady: boolean;
    needsQrCode: boolean;
    qrCode: string | null;
  } {
    return this.sessions.get(deviceId)?.getStatus() ?? {
      isReady: false,
      needsQrCode: false,
      qrCode: null,
    };
  }

  /**
   * Obtém QR para um dispositivo (inicia sessão sob demanda). force=true limpa auth só deste device.
   */
  async getDeviceQrCode(
    deviceId: string,
    forceNewSession: boolean,
  ): Promise<{ qrCode: string | null; message?: string }> {
    const exists = await this.deviceRepo.exist({ where: { id: deviceId } });
    if (!exists) {
      throw new NotFoundException('Dispositivo não encontrado');
    }

    return this.enqueueDeviceOp(deviceId, async () => {
      if (forceNewSession) {
        await this.reinitializeDeviceUnlocked(deviceId, true);
      } else {
        const s = this.getOrCreateSession(deviceId);
        void s.initialize().catch((e) =>
          this.logger.warn(`[WA ${deviceId}] init em background: ${e?.message || e}`),
        );
      }

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const st = this.getDeviceSessionStatus(deviceId);
        if (st.qrCode) return { qrCode: st.qrCode };
        if (st.isReady) {
          return {
            qrCode: null,
            message: 'WhatsApp já está conectado neste dispositivo.',
          };
        }
      }

      return {
        qrCode: null,
        message: forceNewSession
          ? 'QR Code sendo gerado. Aguarde e atualize, ou use o WebSocket.'
          : 'QR Code não disponível. Tente forçar novo QR ou iniciar a sessão.',
      };
    });
  }

  async reinitializeDevice(deviceId: string, forceNewSession: boolean): Promise<void> {
    await this.enqueueDeviceOp(deviceId, () =>
      this.reinitializeDeviceUnlocked(deviceId, forceNewSession),
    );
  }

  /** Chamado apenas dentro de `enqueueDeviceOp` ou quando já há exclusão por dispositivo. */
  private async reinitializeDeviceUnlocked(
    deviceId: string,
    forceNewSession: boolean,
  ): Promise<void> {
    const existing = this.sessions.get(deviceId);
    if (existing) {
      await existing.destroy(forceNewSession);
      this.sessions.delete(deviceId);
    } else if (forceNewSession) {
      const s = this.createSession(deviceId);
      await s.destroy(true);
    }
    const s = this.getOrCreateSession(deviceId);
    await s.initialize();
  }

  /** Legacy: reinicia apenas o dispositivo padrão. */
  async reinitializeClient(forceNewSession = false): Promise<void> {
    const id = await this.requireDefaultDeviceId();
    await this.reinitializeDevice(id, forceNewSession);
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const exists = await this.deviceRepo.exist({ where: { id: deviceId } });
    if (!exists) throw new NotFoundException('Dispositivo não encontrado');
    await this.disconnectDeviceIfExists(deviceId);
    sendDisconnectionToUsers('Sessão do dispositivo encerrada');
    sendStatusToUsers(this.getDeviceSessionStatus(deviceId), undefined, deviceId);
  }

  /** Remove sessão em memória e pasta de auth deste device (ex.: ao excluir cadastro). */
  async disconnectDeviceIfExists(deviceId: string): Promise<void> {
    const s = this.sessions.get(deviceId);
    if (s) {
      await s.destroy(true);
      this.sessions.delete(deviceId);
      return;
    }
    const tmp = this.createSession(deviceId);
    await tmp.destroy(true);
  }

  /**
   * Desconecta todas as sessões e remove dados locais de autenticação de todos os devices conhecidos.
   */
  async disconnect(): Promise<void> {
    for (const [id, sess] of this.sessions) {
      await sess.destroy(true);
      this.sessions.delete(id);
    }
    sendDisconnectionToUsers('Desconectado manualmente');
    await this.refreshDefaultDeviceIdCache();
    if (this.cachedDefaultDeviceId) {
      sendStatusToUsers(this.getDeviceSessionStatus(this.cachedDefaultDeviceId));
    }
    this.logger.log('Todas as sessões WhatsApp foram encerradas.');
  }

  async onModuleInit(): Promise<void> {
    await this.refreshDefaultDeviceIdCache();
    if (this.cachedDefaultDeviceId) {
      this.startDeviceSession(this.cachedDefaultDeviceId).catch((err) => {
        this.logger.error('Erro ao iniciar sessão do dispositivo padrão:', err);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [, sess] of this.sessions) {
      try {
        await sess.destroy(false);
      } catch {
        /* ignore */
      }
    }
    this.sessions.clear();
  }

  getQrCode(): string | null {
    if (!this.cachedDefaultDeviceId) return null;
    return this.sessions.get(this.cachedDefaultDeviceId)?.getQrCode() ?? null;
  }

  getStatus(): {
    isReady: boolean;
    needsQrCode: boolean;
    qrCode: string | null;
  } {
    if (!this.cachedDefaultDeviceId) {
      return { isReady: false, needsQrCode: false, qrCode: null };
    }
    return this.getDeviceSessionStatus(this.cachedDefaultDeviceId);
  }

  isClientReady(): boolean {
    if (!this.cachedDefaultDeviceId) return false;
    return this.sessions.get(this.cachedDefaultDeviceId)?.isClientReady() ?? false;
  }

  async getGroups(): Promise<
    Array<{ id: string; name: string; participantsCount: number }>
  > {
    const id = await this.requireDefaultDeviceId().catch(() => null);
    if (!id) return [];
    const s = this.sessions.get(id);
    const client = s?.getClient();
    if (!s?.isClientReady() || !client) {
      this.logger.warn('Cliente WhatsApp (padrão) não está pronto. getGroups vazio.');
      return [];
    }

    try {
      const page = (client as any).pupPage;
      if (page && typeof page.isClosed === 'function' && page.isClosed()) {
        return [];
      }
    } catch {
      /* ignore */
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao buscar grupos')), 30000);
      });
      const chats = await Promise.race([client.getChats(), timeoutPromise]);
      const groups = chats.filter((chat) => {
        try {
          return chat.isGroup;
        } catch {
          return false;
        }
      });

      const groupsList: Array<{
        id: string;
        name: string;
        participantsCount: number;
      }> = [];

      for (const group of groups) {
        try {
          if (!group?.id?._serialized) continue;
          groupsList.push({
            id: group.id._serialized,
            name: group.name || 'Sem nome',
            participantsCount: 0,
          });
        } catch {
          continue;
        }
      }
      return groupsList;
    } catch (error: any) {
      this.logger.error(
        `getGroups erro: ${error?.message || error}`,
      );
      return [];
    }
  }

  /**
   * Usa o dispositivo padrão (notificações de arquivo, etc.).
   */
  async sendMessage(
    phoneNumberOrGroupId: string,
    message: string,
  ): Promise<Message> {
    const deviceId = await this.requireDefaultDeviceId();
    return this.sendMessageForDevice(deviceId, phoneNumberOrGroupId, message);
  }

  async sendMessageForDevice(
    deviceId: string,
    phoneNumberOrGroupId: string,
    message: string,
  ): Promise<Message> {
    const s = this.sessions.get(deviceId);
    if (!s?.isClientReady()) {
      throw new Error(
        'Cliente WhatsApp deste dispositivo não está pronto. Escaneie o QR em Dispositivos.',
      );
    }
    const client = s.getClient();
    if (!client) {
      throw new Error('Cliente WhatsApp não inicializado para este dispositivo.');
    }
    return this.dispatchSend(client, phoneNumberOrGroupId, message);
  }

  private async dispatchSend(
    client: Client,
    phoneNumberOrGroupId: string,
    message: string,
  ): Promise<Message> {
    this.logger.log(`[WHATSAPP] sendMessage: ${phoneNumberOrGroupId}`);

    if (this.isGroupId(phoneNumberOrGroupId)) {
      try {
        let sendResult: any = null;
        try {
          sendResult = await client.sendMessage(phoneNumberOrGroupId, message);
          return sendResult;
        } catch (sendError: any) {
          const errorMessage = sendError?.message || sendError?.toString() || '';
          if (
            errorMessage.includes('markedUnread') ||
            errorMessage.includes('Evaluation failed') ||
            errorMessage.includes('Cannot read properties')
          ) {
            try {
              const groupChat = await client.getChatById(phoneNumberOrGroupId);
              if (groupChat && groupChat.isGroup) {
                try {
                  const messages = await groupChat.fetchMessages({ limit: 5 });
                  const recentMessage = messages.find((msg: any) => {
                    const msgBody = msg.body || '';
                    const msgTime = msg.timestamp || 0;
                    const timeDiff = Date.now() / 1000 - msgTime;
                    return (
                      timeDiff < 30 &&
                      (msgBody.includes(message.substring(0, 20)) ||
                        msgBody.includes('Novo Documento') ||
                        msgBody.includes('documento foi disponibilizado'))
                    );
                  });
                  if (recentMessage) return recentMessage as any;
                } catch {
                  /* ignore */
                }
                return {
                  id: { _serialized: `partial_${Date.now()}` },
                  from: phoneNumberOrGroupId,
                  to: phoneNumberOrGroupId,
                  body: message,
                  timestamp: Math.floor(Date.now() / 1000),
                  _partial: true,
                } as any;
              }
            } catch (verifyError: any) {
              throw new Error(
                `Grupo não encontrado ou sem acesso: ${verifyError?.message || verifyError}`,
              );
            }
          }
          throw sendError;
        }
      } catch (error: any) {
        throw error;
      }
    }

    /** JID já no formato WhatsApp (contato por LID ou PN); não converter para @c.us. */
    if (phoneNumberOrGroupId.endsWith('@lid')) {
      return await client.sendMessage(phoneNumberOrGroupId, message);
    }
    if (phoneNumberOrGroupId.endsWith('@c.us')) {
      return await client.sendMessage(phoneNumberOrGroupId, message);
    }

    try {
      const formattedNumber = this.formatPhoneNumberWithout9(phoneNumberOrGroupId);
      return await client.sendMessage(formattedNumber, message);
    } catch (firstError: any) {
      const errorMessage = firstError?.message || firstError?.toString() || '';
      if (
        errorMessage.includes('No LID for user') ||
        errorMessage.includes('Evaluation failed')
      ) {
        const cleaned = phoneNumberOrGroupId.replace(/[^\d+]/g, '').replace(/^\+/, '');
        const isBrazilianNumber =
          (cleaned.length === 12 && cleaned.startsWith('55')) ||
          (cleaned.length === 10 && !cleaned.startsWith('55'));
        if (isBrazilianNumber) {
          try {
            const formattedNumberWith9 =
              this.formatPhoneNumberWith9(phoneNumberOrGroupId);
            return await client.sendMessage(formattedNumberWith9, message);
          } catch {
            throw new Error(
              `Não foi possível enviar mensagem para ${phoneNumberOrGroupId}.`,
            );
          }
        }
        throw new Error(
          `Não foi possível enviar mensagem para ${phoneNumberOrGroupId}.`,
        );
      }
      this.logger.error(
        `Erro ao enviar mensagem para ${phoneNumberOrGroupId}:`,
        firstError,
      );
      throw firstError;
    }
  }

  async sendDocumentNotification(data: {
    companyName: string;
    phoneNumber: string;
    fileName: string;
    year: number;
    month: string;
    loginUrl: string;
  }): Promise<Message> {
    if (!this.isClientReady()) {
      throw new Error('Cliente WhatsApp não está pronto. Verifique a conexão.');
    }
    const message = this.formatDocumentNotificationMessage(data);
    return this.sendMessage(data.phoneNumber, message);
  }

  private formatDocumentNotificationMessage(data: {
    companyName: string;
    fileName: string;
    year: number;
    month: string;
    loginUrl: string;
  }): string {
    const companyName = process.env.COMPANY_NAME || 'Naciopetro';
    return `📄 *Novo Documento Disponível*

Olá, ${data.companyName}!

Um novo documento foi disponibilizado em sua pasta de documentos.

📋 *Detalhes:*
• Nome do arquivo: ${data.fileName}
• Período: ${data.month} de ${data.year}

🔗 Para acessar seus documentos, visite:
${data.loginUrl}

---
Atenciosamente,
Equipe ${companyName}`;
  }

  private formatPhoneNumberWithout9(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error(`Número inválido: ${cleaned.length} dígitos`);
    }
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      if (cleaned.charAt(4) === '9') {
        cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
      }
    } else if (cleaned.length === 10 || cleaned.length === 11) {
      if (cleaned.length === 11 && cleaned.charAt(2) === '9') {
        cleaned = cleaned.substring(0, 2) + cleaned.substring(3);
      }
      cleaned = '55' + cleaned;
    }
    return `${cleaned}@c.us`;
  }

  private formatPhoneNumberWith9(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.length === 12 && cleaned.startsWith('55')) {
      cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4);
    }
    return `${cleaned}@c.us`;
  }

  private isGroupId(contactId: string): boolean {
    return contactId.includes('@g.us');
  }
}
