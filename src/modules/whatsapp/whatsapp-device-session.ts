import { Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import * as path from 'path';
import * as fs from 'fs';
import {
  sendQrCodeToUsers,
  sendStatusToUsers,
  sendDisconnectionToUsers,
  sendConnectedToUsers,
} from '../../websocket/ws/whatsapp.websocket';
import type { WhatsAppInboundPayload } from './whatsapp-inbound.types';

export type WaSessionStatus = {
  isReady: boolean;
  needsQrCode: boolean;
  qrCode: string | null;
};

/**
 * Uma sessão whatsapp-web.js por dispositivo (UUID do cadastro).
 * Pasta de auth: `.wwebjs_auth/session-device-{deviceId}/`
 */
export class WhatsAppDeviceSession {
  private client: Client | null = null;
  private isReady = false;
  private currentQrCode: string | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  private fallbackApiCheckTimeoutId: NodeJS.Timeout | null = null;
  private forceReinitTimeoutId: NodeJS.Timeout | null = null;

  constructor(
    readonly deviceId: string,
    private readonly logger: Logger,
    private readonly onInbound: (payload: WhatsAppInboundPayload) => Promise<void>,
    private readonly onForceReinit: (deviceId: string) => void,
  ) {}

  getClient(): Client | null {
    return this.client;
  }

  isClientReady(): boolean {
    return this.isReady && this.client !== null;
  }

  getStatus(): WaSessionStatus {
    return {
      isReady: this.isReady,
      needsQrCode: !this.isReady && this.currentQrCode !== null,
      qrCode: this.currentQrCode,
    };
  }

  getQrCode(): string | null {
    return this.currentQrCode;
  }

  private clearAuthenticatedTimers(): void {
    if (this.fallbackApiCheckTimeoutId) {
      clearTimeout(this.fallbackApiCheckTimeoutId);
      this.fallbackApiCheckTimeoutId = null;
    }
    if (this.forceReinitTimeoutId) {
      clearTimeout(this.forceReinitTimeoutId);
      this.forceReinitTimeoutId = null;
    }
  }

  private markReadyAndNotify(source: 'ready' | 'fallback'): void {
    this.isReady = true;
    this.currentQrCode = null;
    this.logger.log(
      `[WA ${this.deviceId}] Pronto (origem: ${source})`,
    );
    sendConnectedToUsers();
    sendStatusToUsers(this.getStatus(), undefined, this.deviceId);
  }

  /** Fecha Puppeteer/Chromium e zera estado local (não apaga pasta de auth). */
  private async shutdownClientBrowser(): Promise<void> {
    this.clearAuthenticatedTimers();
    if (this.client) {
      try {
        this.client.removeAllListeners();
      } catch {
        /* ignore */
      }
      try {
        await Promise.race([
          this.client.destroy(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000),
          ),
        ]);
      } catch {
        /* ignore */
      } finally {
        this.client = null;
      }
    }
    this.isReady = false;
    this.currentQrCode = null;
  }

  /**
   * Chromium deixa arquivos de lock no perfil; se o processo morreu, o lock impede novo launch.
   */
  private clearStaleChromiumLocks(userDataDir: string): void {
    if (!fs.existsSync(userDataDir)) return;
    const names = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
    for (const n of names) {
      const p = path.join(userDataDir, n);
      try {
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
          this.logger.log(`[WA ${this.deviceId}] Lock órfão removido: ${n}`);
        }
      } catch (e) {
        this.logger.warn(
          `[WA ${this.deviceId}] Não foi possível remover ${n}:`,
          e,
        );
      }
    }
  }

  private isBrowserAlreadyRunningError(err: unknown): boolean {
    const msg = (err as Error)?.message ?? String(err);
    return /browser is already running/i.test(msg);
  }

  private scheduleAuthenticatedFallbacks(): void {
    this.clearAuthenticatedTimers();

    this.fallbackApiCheckTimeoutId = setTimeout(async () => {
      this.fallbackApiCheckTimeoutId = null;
      if (this.isReady || !this.client) return;
      try {
        const chatsPromise = this.client.getChats();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000),
        );
        await Promise.race([chatsPromise, timeoutPromise]);
        this.clearAuthenticatedTimers();
        this.markReadyAndNotify('fallback');
      } catch (e: any) {
        this.logger.warn(
          `[WA ${this.deviceId}] Fallback getChats: ${e?.message || e}`,
        );
      }
    }, 15000);

    this.forceReinitTimeoutId = setTimeout(() => {
      this.forceReinitTimeoutId = null;
      if (this.isReady || !this.client) return;
      this.logger.warn(
        `[WA ${this.deviceId}] ready não veio em 65s; forçando nova sessão.`,
      );
      this.clearAuthenticatedTimers();
      this.onForceReinit(this.deviceId);
    }, 65000);
  }

  private async doInitialize(): Promise<void> {
    const authRoot = path.join(process.cwd(), '.wwebjs_auth');
    if (!fs.existsSync(authRoot)) {
      fs.mkdirSync(authRoot, { recursive: true });
    }

    if (this.client && this.isReady) {
      this.logger.warn(`[WA ${this.deviceId}] Já pronto, ignorando init.`);
      return;
    }

    if (this.client) {
      this.logger.warn(
        `[WA ${this.deviceId}] Encerrando instância anterior do browser antes de novo initialize.`,
      );
      await this.shutdownClientBrowser();
    }

    const clientId = `device-${this.deviceId}`;
    const sessionDir = this.sessionAuthDir();
    this.clearStaleChromiumLocks(sessionDir);

    const attachClient = (): void => {
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: authRoot,
          clientId,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--safebrowsing-disable-auto-update',
            '--disable-ipc-flooding-protection',
          ],
          timeout: 120000,
        },
      });

      this.client.on('qr', (qr) => {
        this.logger.warn(`[WA ${this.deviceId}] QR gerado.`);
        this.currentQrCode = qr;
        qrcode.generate(qr, { small: true });
        sendQrCodeToUsers(qr, undefined, this.deviceId);
        sendStatusToUsers(this.getStatus(), undefined, this.deviceId);
      });

      this.client.on('ready', () => {
        this.logger.log(`[WA ${this.deviceId}] evento ready`);
        this.clearAuthenticatedTimers();
        this.markReadyAndNotify('ready');
      });

      this.client.on('authenticated', () => {
        this.logger.log(`[WA ${this.deviceId}] authenticated`);
        this.scheduleAuthenticatedFallbacks();
      });

      this.client.on('auth_failure', (msg) => {
        this.clearAuthenticatedTimers();
        this.logger.error(`[WA ${this.deviceId}] auth_failure:`, msg);
        this.isReady = false;
        this.currentQrCode = null;
        sendStatusToUsers(this.getStatus(), undefined, this.deviceId);
      });

      this.client.on('disconnected', (reason) => {
        this.clearAuthenticatedTimers();
        this.logger.warn(`[WA ${this.deviceId}] disconnected:`, reason);
        this.isReady = false;
        this.currentQrCode = null;
        sendDisconnectionToUsers(String(reason));
        sendStatusToUsers(this.getStatus(), undefined, this.deviceId);
      });

      this.client.on('error', (error: any) => {
        const errorMessage = error?.message || error?.toString() || '';
        if (
          errorMessage.includes('Session closed') ||
          errorMessage.includes('page has been closed') ||
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Protocol error')
        ) {
          this.logger.warn(`[WA ${this.deviceId}] página/sessão fechada`);
          this.isReady = false;
          sendDisconnectionToUsers('Página fechada');
          sendStatusToUsers(this.getStatus(), undefined, this.deviceId);
        } else {
          this.logger.error(`[WA ${this.deviceId}] erro:`, error);
        }
      });

      this.client.on('message', async (msg: Message) => {
        try {
          if (msg.fromMe) return;
          const from = msg.from;
          if (!from || from.endsWith('@g.us')) return;
          if ((msg as { broadcast?: boolean }).broadcast) return;
          const body = (msg.body ?? '').trim();
          if (!body) return;
          const notify = (msg as { _data?: { notifyName?: string } })._data
            ?.notifyName;
          await this.onInbound({
            deviceId: this.deviceId,
            waChatId: from,
            body: msg.body ?? '',
            waMessageId: msg.id?._serialized,
            contactName: notify,
          });
        } catch (e: any) {
          this.logger.warn(
            `[WA ${this.deviceId}] inbound: ${e?.message || e}`,
          );
        }
      });
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      attachClient();
      this.logger.log(`[WA ${this.deviceId}] initialize()... (tentativa ${attempt + 1})`);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Timeout: initialize() > 120s')),
          120000,
        );
      });
      try {
        const initPromise = this.client!.initialize();
        await Promise.race([initPromise, timeoutPromise]);
        this.logger.log(
          `[WA ${this.deviceId}] initialize() concluído (aguardando QR ou ready).`,
        );
        return;
      } catch (e: unknown) {
        if (
          attempt === 0 &&
          this.isBrowserAlreadyRunningError(e)) {
          this.logger.warn(
            `[WA ${this.deviceId}] userDataDir ainda bloqueado; fechando cliente, removendo locks e tentando novamente.`,
          );
          await this.shutdownClientBrowser();
          this.clearStaleChromiumLocks(sessionDir);
          continue;
        }
        throw e;
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = this.doInitialize();
    this.isInitializing = true;
    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  private sessionAuthDir(): string {
    const authRoot = path.join(process.cwd(), '.wwebjs_auth');
    const clientId = `device-${this.deviceId}`;
    return path.join(authRoot, `session-${clientId}`);
  }

  /**
   * Destrói o cliente e opcionalmente apaga só a pasta desta sessão.
   */
  async destroy(clearAuth: boolean): Promise<void> {
    await this.shutdownClientBrowser();
    this.isInitializing = false;
    this.initializationPromise = null;

    if (clearAuth) {
      const dir = this.sessionAuthDir();
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          this.logger.log(`[WA ${this.deviceId}] pasta de sessão removida.`);
        } catch (e) {
          this.logger.warn(`[WA ${this.deviceId}] erro ao remover auth:`, e);
        }
      }
    }
    sendStatusToUsers(this.getStatus(), undefined, this.deviceId);
  }
}
