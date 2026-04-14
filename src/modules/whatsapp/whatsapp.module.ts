import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppThreadsService } from './whatsapp-threads.service';
import { WhatsAppThreadsController } from './whatsapp-threads.controller';
import { WhatsAppInboundBootstrap } from './whatsapp-inbound.bootstrap';
import { WhatsAppDevice } from './entities/whatsapp-device.entity';
import { WhatsAppThread } from './entities/whatsapp-thread.entity';
import { WhatsAppThreadMessage } from './entities/whatsapp-thread-message.entity';
import { Agent } from '../agents/entities/agent.entity';
import { WhatsAppDevicesService } from './whatsapp-devices.service';
import { WhatsAppDevicesController } from './whatsapp-devices.controller';
import { AgentsModule } from '../agents/agents.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => AgentsModule),
    UsersModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      WhatsAppDevice,
      WhatsAppThread,
      WhatsAppThreadMessage,
      Agent,
    ]),
  ],
  controllers: [
    WhatsAppController,
    WhatsAppThreadsController,
    WhatsAppDevicesController,
  ],
  providers: [
    WhatsAppService,
    WhatsAppThreadsService,
    WhatsAppDevicesService,
    WhatsAppInboundBootstrap,
  ],
  exports: [WhatsAppService, WhatsAppThreadsService, WhatsAppDevicesService],
})
export class WhatsAppModule {}

