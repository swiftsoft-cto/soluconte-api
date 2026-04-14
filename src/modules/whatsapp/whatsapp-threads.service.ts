import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppDevice } from './entities/whatsapp-device.entity';
import { WhatsAppThread } from './entities/whatsapp-thread.entity';
import {
  WhatsAppThreadMessage,
  WhatsAppLineDirection,
} from './entities/whatsapp-thread-message.entity';
import { WhatsAppService } from './whatsapp.service';
import type { WhatsAppInboundPayload } from './whatsapp-inbound.types';
import { ChatService } from '../agents/chat.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from '../notifications/entities/notification.entity';
import { broadcastWhatsAppChatMessage } from '../../websocket/ws/whatsapp.websocket';

@Injectable()
export class WhatsAppThreadsService {
  private readonly logger = new Logger(WhatsAppThreadsService.name);

  constructor(
    @InjectRepository(WhatsAppDevice)
    private readonly deviceRepo: Repository<WhatsAppDevice>,
    @InjectRepository(WhatsAppThread)
    private readonly threadRepo: Repository<WhatsAppThread>,
    @InjectRepository(WhatsAppThreadMessage)
    private readonly messageRepo: Repository<WhatsAppThreadMessage>,
    private readonly whatsAppService: WhatsAppService,
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Chamado pelo WhatsAppService ao receber mensagem 1:1. */
  async ingestInboundMessage(payload: WhatsAppInboundPayload): Promise<void> {
    const body = (payload.body ?? '').trim();
    if (!body) return;

    let device: WhatsAppDevice | null = null;
    if (payload.deviceId) {
      device = await this.deviceRepo.findOne({ where: { id: payload.deviceId } });
    }
    if (!device) {
      device = await this.getOrCreateDefaultDevice();
    }
    const thread = await this.ensureThread(
      device.id,
      payload.waChatId,
      payload.contactName ?? null,
    );

    const msg = this.messageRepo.create({
      threadId: thread.id,
      direction: 'inbound' as WhatsAppLineDirection,
      body,
      waMessageId: payload.waMessageId ?? null,
    });
    await this.messageRepo.save(msg);

    thread.lastMessageAt = new Date();
    thread.unreadCount = (thread.unreadCount ?? 0) + 1;
    await this.threadRepo.save(thread);

    this.emitChatMessageRealtime(thread, msg);

    const tid = thread.id;
    setImmediate(() => {
      void this.tryAutoReplyAfterInbound(tid).catch((err: Error) =>
        this.logger.error(
          `Falha na resposta automática (IA): ${err?.message ?? err}`,
          err?.stack,
        ),
      );
    });
  }

  /**
   * Se a thread tem IA ligada e agente, gera resposta e envia pelo WhatsApp.
   */
  private async tryAutoReplyAfterInbound(threadId: string): Promise<void> {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: ['device'],
    });
    if (!thread?.aiEnabled || !thread.agentId) return;

    const rows = await this.messageRepo.find({
      where: { threadId },
      order: { createdAt: 'ASC' },
    });
    if (rows.length === 0) return;

    const mapped = rows.map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as
        | 'user'
        | 'assistant',
      content: m.body,
    }));
    const last = mapped[mapped.length - 1];
    if (last.role !== 'user' || !last.content?.trim()) return;

    const history = mapped.slice(0, -1);
    const actingId =
      thread.aiActingUserId ?? thread.device?.aiActingUserId ?? null;
    let currentUser: any = null;
    if (actingId) {
      try {
        const full = await this.usersService.findOneWithRelations(actingId);
        const isAdministrator = full.userRoles.some((userRole) =>
          userRole.role.roleRules.some(
            (roleRule) => roleRule.rule.rule === 'administrator',
          ),
        );
        currentUser = { ...full, isMaster: isAdministrator };
      } catch {
        this.logger.warn(
          `aiActingUserId inválido ou usuário sem empresa (thread ${threadId}): ${actingId}`,
        );
      }
    } else {
      this.logger.warn(
        `Thread ${threadId}: IA ativa sem usuário responsável (ative a IA ou vincule o agente no dispositivo estando logado).`,
      );
    }

    let reply: { text: string; fallback: boolean; reason?: string };
    try {
      reply = await this.chatService.whatsAppAutoReply(
        thread.agentId,
        history,
        last.content.trim(),
        currentUser,
      );
    } catch (e) {
      // ChatService.whatsAppAutoReply nunca deveria lançar — mas se algo
      // inesperado vazar, logamos e abortamos sem travar o listener inbound.
      this.logger.error(
        `Erro inesperado no auto-reply (thread ${threadId}): ${(e as Error)?.message}`,
        (e as Error)?.stack,
      );
      return;
    }

    const text = reply.text?.trim();
    if (!text) return;

    // Envia a resposta (seja da IA ou do fallback) para o usuário final no WhatsApp.
    try {
      await this.sendOutboundText(threadId, text);
    } catch (e) {
      this.logger.error(
        `Falha ao enviar resposta no WhatsApp (thread ${threadId}): ${(e as Error)?.message}`,
        (e as Error)?.stack,
      );
    }

    // Se foi fallback, notifica o operador responsável para follow-up manual.
    if (reply.fallback && actingId) {
      try {
        await this.notifyOperatorFallback({
          userId: actingId,
          threadId,
          contactLabel:
            thread.contactName || thread.contactPhone || thread.waChatId,
          reason: reply.reason,
          lastUserMessage: last.content.trim(),
        });
      } catch (e) {
        this.logger.error(
          `Falha ao notificar operador (thread ${threadId}): ${(e as Error)?.message}`,
          (e as Error)?.stack,
        );
      }
    } else if (reply.fallback) {
      this.logger.warn(
        `Thread ${threadId}: fallback enviado mas sem usuário responsável para notificar.`,
      );
    }
  }

  /**
   * Cria uma notificação in-app avisando que a resposta automática caiu no fallback
   * e precisa de intervenção humana.
   */
  private async notifyOperatorFallback(params: {
    userId: string;
    threadId: string;
    contactLabel: string;
    reason?: string;
    lastUserMessage: string;
  }): Promise<void> {
    const snippet =
      params.lastUserMessage.length > 160
        ? params.lastUserMessage.slice(0, 157) + '...'
        : params.lastUserMessage;
    await this.notificationsService.create({
      type: NotificationType.SYSTEM,
      title: 'IA indisponível — atenda manualmente',
      message: `A resposta automática para ${params.contactLabel} caiu no fallback (${params.reason ?? 'indisponível'}). Última mensagem do cliente: "${snippet}"`,
      referenceType: 'whatsapp_thread',
      referenceId: params.threadId,
      userId: params.userId,
      scheduledAt: new Date(),
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      channel: NotificationChannel.IN_APP,
    });
  }

  async listThreads(deviceId?: string): Promise<WhatsAppThread[]> {
    const order = { lastMessageAt: 'DESC' as const, updatedAt: 'DESC' as const };
    if (deviceId) {
      return this.threadRepo.find({
        where: { deviceId },
        order,
        relations: ['device'],
      });
    }
    return this.threadRepo.find({
      order,
      relations: ['device'],
    });
  }

  async getThread(threadId: string): Promise<WhatsAppThread> {
    const t = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: ['device'],
    });
    if (!t) throw new NotFoundException('Thread não encontrada');
    return t;
  }

  async listMessages(threadId: string): Promise<WhatsAppThreadMessage[]> {
    await this.getThread(threadId);
    return this.messageRepo.find({
      where: { threadId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendOutboundText(
    threadId: string,
    text: string,
  ): Promise<WhatsAppThreadMessage> {
    const thread = await this.getThread(threadId);
    const sent = await this.whatsAppService.sendMessageForDevice(
      thread.deviceId,
      thread.waChatId,
      text,
    );
    const waId =
      (sent as { id?: { _serialized?: string } })?.id?._serialized ?? null;

    const msg = this.messageRepo.create({
      threadId: thread.id,
      direction: 'outbound' as WhatsAppLineDirection,
      body: text,
      waMessageId: waId,
    });
    await this.messageRepo.save(msg);

    thread.lastMessageAt = new Date();
    await this.threadRepo.save(thread);

    this.emitChatMessageRealtime(thread, msg);

    return msg;
  }

  async markRead(threadId: string): Promise<void> {
    const thread = await this.getThread(threadId);
    thread.unreadCount = 0;
    await this.threadRepo.save(thread);
  }

  async patchAi(
    threadId: string,
    enabled: boolean,
    agentId: string | null | undefined,
    loggedUserId: string,
  ): Promise<WhatsAppThread> {
    const thread = await this.getThread(threadId);
    thread.aiEnabled = enabled;
    thread.agentId = enabled && agentId ? agentId : null;
    thread.aiActingUserId = enabled ? loggedUserId : null;
    return this.threadRepo.save(thread);
  }

  private emitChatMessageRealtime(
    thread: WhatsAppThread,
    msg: WhatsAppThreadMessage,
  ): void {
    const lastAt = thread.lastMessageAt;
    broadcastWhatsAppChatMessage({
      threadId: thread.id,
      message: {
        id: msg.id,
        threadId: msg.threadId,
        direction: msg.direction,
        body: msg.body,
        waMessageId: msg.waMessageId ?? null,
        createdAt:
          msg.createdAt instanceof Date
            ? msg.createdAt.toISOString()
            : String(msg.createdAt),
      },
      threadPreview: {
        lastMessageAt:
          lastAt instanceof Date
            ? lastAt.toISOString()
            : lastAt
              ? String(lastAt)
              : null,
        unreadCount: thread.unreadCount ?? 0,
      },
    });
  }

  private async getOrCreateDefaultDevice(): Promise<WhatsAppDevice> {
    let d = await this.deviceRepo.findOne({ where: { isDefault: true } });
    if (!d) {
      d = this.deviceRepo.create({
        name: 'Principal',
        phoneLabel: null,
        isDefault: true,
      });
      await this.deviceRepo.save(d);
      this.logger.log('Dispositivo WhatsApp padrão criado (Principal).');
    }
    return d;
  }

  private phoneFromWaChatId(waChatId: string): string | null {
    const base = waChatId.split('@')[0] ?? '';
    return base || null;
  }

  private async ensureThread(
    deviceId: string,
    waChatId: string,
    contactName: string | null,
  ): Promise<WhatsAppThread> {
    let thread = await this.threadRepo.findOne({
      where: { deviceId, waChatId },
    });
    if (thread) {
      if (contactName && !thread.contactName) {
        thread.contactName = contactName;
        thread.contactPhone = this.phoneFromWaChatId(waChatId);
        await this.threadRepo.save(thread);
      }
      return thread;
    }
    const deviceWithAgent = await this.deviceRepo.findOne({
      where: { id: deviceId },
      relations: ['agent'],
    });
    const defaultAgentId = deviceWithAgent?.agent?.id ?? null;
    const actingFromDevice = deviceWithAgent?.aiActingUserId ?? null;

    thread = this.threadRepo.create({
      deviceId,
      waChatId,
      contactName,
      contactPhone: this.phoneFromWaChatId(waChatId),
      lastMessageAt: null,
      unreadCount: 0,
      aiEnabled: !!defaultAgentId,
      agentId: defaultAgentId,
      aiActingUserId: defaultAgentId ? actingFromDevice : null,
    });
    await this.threadRepo.save(thread);
    return thread;
  }
}
