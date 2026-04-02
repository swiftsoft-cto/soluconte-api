import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AgentFile } from './entities/agent-file.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OpenAIService } from './services/openai.service';
import { AgentContextService } from './services/agent-context.service';
import { AgentToolsService } from './services/agent-tools.service';
import { StorageModule } from '../storage/storage.module';
import { CompaniesModule } from '../companies/companies.module';
import { FileManagementModule } from '../file-management/file-management.module';
import { InternalTasksModule } from '../internal-tasks/internal-tasks.module';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Conversation, Message, AgentFile]),
    StorageModule,
    CompaniesModule,
    forwardRef(() => FileManagementModule),
    InternalTasksModule,
    UsersModule,
    DepartmentsModule,
    EmailModule,
  ],
  providers: [AgentsService, ConversationsService, ChatService, OpenAIService, AgentContextService, AgentToolsService],
  // Ordem importa: rotas mais específicas (conversations, chat) antes de AgentsController que tem GET :id
  controllers: [ConversationsController, ChatController, AgentsController],
  exports: [AgentsService, ConversationsService, ChatService],
})
export class AgentsModule {}
