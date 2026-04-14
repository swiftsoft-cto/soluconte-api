import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Company } from '../companies/entities/companies.entity';
import { Agent } from './entities/agent.entity';
import { AgentFile } from './entities/agent-file.entity';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { UpdateAgentDto } from './dtos/update-agent.dto';
import { OpenAIService } from './services/openai.service';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(AgentFile)
    private readonly agentFileRepository: Repository<AgentFile>,
    private readonly openAIService: OpenAIService,
  ) {}

  async create(userId: string, companyId: string | null, dto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepository.create({
      ...dto,
      user: { id: userId },
      company: companyId ? { id: companyId } : undefined,
      scope: dto.scope ?? 'general',
      isActive: dto.isActive ?? true,
      linkedClient: dto.linkedCompanyId ? { id: dto.linkedCompanyId } : undefined,
    });
    return this.agentRepository.save(agent);
  }

  async findAllByUser(userId: string, companyId?: string | null): Promise<Agent[]> {
    const qb = this.agentRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.files', 'files')
      .leftJoinAndSelect('agent.linkedClient', 'linkedClient')
      .where('agent.user_id = :userId', { userId });
    if (companyId) {
      qb.andWhere('(agent.company_id IS NULL OR agent.company_id = :companyId)', {
        companyId,
      });
    }
    qb.orderBy('agent.updated_at', 'DESC');
    return qb.getMany();
  }

  /**
   * Agentes disponíveis para o chat (balão).
   * - Usuário interno (isRootUser = false): escopos general e internal, opcionalmente filtrados por companyId.
   * - Cliente (isRootUser = true): vê todos os agentes de escopo general (configuração geral) +
   *   agentes de escopo client vinculados à empresa dele (linkedClient = companyId).
   */
  async findForChat(userId: string, companyId: string | null, isRootUser: boolean): Promise<Agent[]> {
    const qb = this.agentRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.files', 'files')
      .leftJoinAndSelect('agent.linkedClient', 'linkedClient');

    if (isRootUser) {
      // Cliente: (gerais OU personalizado da empresa) E ativo — parênteses para is_active valer para ambos
      qb.where(
        new Brackets((q) => {
          if (companyId) {
            q.where('agent.scope = :general', { general: 'general' });
            q.orWhere(
              new Brackets((qb2) => {
                qb2.where('agent.scope = :client', { client: 'client' });
                qb2.andWhere('linkedClient.id = :companyId', { companyId });
              }),
            );
          } else {
            q.where('agent.scope = :general', { general: 'general' });
          }
        }),
      );
    } else {
      // Usuário interno: mantém comportamento anterior (general + internal, filtrados por companyId quando houver).
      qb.where('(agent.scope = :general OR agent.scope = :internal)', {
        general: 'general',
        internal: 'internal',
      });
      if (companyId) {
        qb.andWhere('(agent.company_id IS NULL OR agent.company_id = :companyId)', {
          companyId,
        });
      }
    }
    qb.andWhere('agent.is_active = :active', { active: true });
    qb.orderBy('agent.updated_at', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string, userId: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['files', 'linkedClient'],
    });
    if (!agent) {
      throw new NotFoundException('Agente não encontrado.');
    }
    return agent;
  }

  /**
   * Carrega agente por ID com instruções, arquivos (contentText, embedding) e linkedClient.
   * Usado no chat para garantir o mesmo contexto da pré-visualização (sem filtrar por dono).
   */
  async findOneWithFiles(agentId: string): Promise<Agent | null> {
    return this.agentRepository.findOne({
      where: { id: agentId },
      relations: ['files', 'linkedClient'],
    });
  }

  async update(id: string, userId: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id, userId);
    const { linkedCompanyId, ...rest } = dto as UpdateAgentDto & { linkedCompanyId?: string };
    Object.assign(agent, rest);
    if (dto.scope !== undefined) {
      agent.scope = dto.scope;
      if (dto.scope !== 'client') agent.linkedClient = undefined;
    }
    if (linkedCompanyId !== undefined) {
      agent.linkedClient = linkedCompanyId ? ({ id: linkedCompanyId } as Company) : undefined;
    }
    return this.agentRepository.save(agent);
  }

  async remove(id: string, userId: string): Promise<void> {
    const agent = await this.findOne(id, userId);
    await this.agentRepository.remove(agent);
  }

  async addFile(
    agentId: string,
    userId: string,
    fileUrl: string,
    fileName: string,
    contentText?: string,
  ): Promise<AgentFile> {
    const agent = await this.findOne(agentId, userId);
    const agentFile = this.agentFileRepository.create({
      agent: { id: agent.id },
      fileUrl,
      fileName,
      contentText: contentText ?? null,
      embeddingStatus: null,
    });
    const saved = await this.agentFileRepository.save(agentFile);

    if (!contentText?.trim()) {
      saved.embeddingStatus = 'skipped';
      await this.agentFileRepository.save(saved);
      return saved;
    }
    if (!this.openAIService.isAvailable()) {
      saved.embeddingStatus = 'unavailable';
      await this.agentFileRepository.save(saved);
      return saved;
    }
    try {
      const embedding = await this.openAIService.createEmbedding(contentText);
      if (embedding.length > 0) {
        saved.embedding = embedding;
        saved.embeddingStatus = 'ready';
      } else {
        saved.embeddingStatus = 'failed';
      }
      await this.agentFileRepository.save(saved);
    } catch {
      // keep file without embedding; RAG will fallback to full content
      saved.embeddingStatus = 'failed';
      await this.agentFileRepository.save(saved);
    }
    return saved;
  }

  async listFiles(agentId: string, userId: string): Promise<AgentFile[]> {
    const agent = await this.findOne(agentId, userId);
    return this.agentFileRepository.find({
      where: { agent: { id: agent.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async removeFile(agentId: string, fileId: string, userId: string): Promise<void> {
    await this.findOne(agentId, userId);
    const file = await this.agentFileRepository.findOne({
      where: { id: fileId, agent: { id: agentId } },
    });
    if (!file) throw new NotFoundException('Arquivo não encontrado.');
    await this.agentFileRepository.remove(file);
  }
}
