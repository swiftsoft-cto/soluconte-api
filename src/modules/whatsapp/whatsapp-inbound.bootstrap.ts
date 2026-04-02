import { Injectable, OnModuleInit } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppThreadsService } from './whatsapp-threads.service';

/**
 * Liga o cliente whatsapp-web.js à persistência de threads sem dependência circular
 * entre WhatsAppService e WhatsAppThreadsService.
 */
@Injectable()
export class WhatsAppInboundBootstrap implements OnModuleInit {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly threadsService: WhatsAppThreadsService,
  ) {}

  onModuleInit() {
    this.whatsAppService.setInboundMessageHandler((payload) =>
      this.threadsService.ingestInboundMessage(payload),
    );
  }
}
