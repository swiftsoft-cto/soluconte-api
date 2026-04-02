import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AgentsService } from './agents.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly agentsService: AgentsService,
  ) {}

  /**
   * Cria conversa com um agente. Não exige ser dono do agente (permite geral/interno do balão).
   */
  async create(
    userId: string,
    agentId: string,
    title?: string,
  ): Promise<Conversation> {
    const agent = await this.agentsService.findOneWithFiles(agentId);
    if (!agent) {
      throw new NotFoundException('Agente não encontrado.');
    }
    const conversation = this.conversationRepository.create({
      title: title || 'Nova conversa',
      user: { id: userId },
      agent: { id: agent.id },
    });
    return this.conversationRepository.save(conversation);
  }

  async findAllByUser(userId: string, agentId?: string): Promise<Conversation[]> {
    const qb = this.conversationRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.agent', 'agent')
      .where('c.user_id = :userId', { userId });
    if (agentId) {
      qb.andWhere('c.agent_id = :agentId', { agentId });
    }
    qb.orderBy('c.updated_at', 'DESC');
    return qb.getMany();
  }

  async findOne(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, user: { id: userId } },
      relations: ['agent', 'agent.files', 'agent.linkedClient', 'messages'],
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    return conversation;
  }

  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    const conversation = await this.findOne(conversationId, userId);
    return conversation.messages || [];
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ): Promise<Message> {
    const message = this.messageRepository.create({
      conversation: { id: conversationId },
      role,
      content,
    });
    const saved = await this.messageRepository.save(message);
    // Atualiza updated_at da conversa para a lista "Conversas" ordenar pela mais recente
    await this.conversationRepository.update(conversationId, { updatedAt: new Date() });
    return saved;
  }

  async updateTitle(conversationId: string, userId: string, title: string): Promise<Conversation> {
    const conversation = await this.findOne(conversationId, userId);
    conversation.title = title;
    return this.conversationRepository.save(conversation);
  }

  async remove(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findOne(conversationId, userId);
    await this.conversationRepository.remove(conversation);
  }
}
