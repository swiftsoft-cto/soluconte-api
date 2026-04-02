import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmNegotiation } from './entities/crm-negotiation.entity';
import { CreateCrmNegotiationDto } from './dtos/create-crm-negotiation.dto';
import { UpdateCrmNegotiationDto } from './dtos/update-crm-negotiation.dto';
import { CrmCompaniesService } from '../companies/crm-companies.service';
import { CrmContactsService } from '../contacts/crm-contacts.service';
import { CrmFunnelService } from '../funnel/crm-funnel.service';
import { CrmStagesService } from '../stages/crm-stages.service';
import { UsersService } from 'src/modules/users/users.service';
import { EmailService } from 'src/modules/email/email.service';
import { CreateLeadDto } from './dtos/create-lead.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CrmNegotiationHistoryService } from '../negotiation-history/crm-negotiation-history.service';
import { User } from 'src/modules/users/entities/user.entity';
import {
  buildActionFromChanges,
  FieldChange,
} from '../negotiation-history/templates/templates';

@Injectable()
export class CrmNegotiationsService {
  private readonly logger = new Logger(CrmNegotiationsService.name);

  constructor(
    @InjectRepository(CrmNegotiation)
    private readonly crmNegotiationRepository: Repository<CrmNegotiation>,
    private readonly crmCompaniesService: CrmCompaniesService,
    private readonly crmContactsService: CrmContactsService,
    private readonly crmFunnelService: CrmFunnelService,
    private readonly crmStagesService: CrmStagesService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly httpService: HttpService,
    private readonly historyService: CrmNegotiationHistoryService,
  ) {}

  async create(
    createCrmNegotiationDto: CreateCrmNegotiationDto,
  ): Promise<CrmNegotiation> {
    const negotiationData: any = { ...createCrmNegotiationDto };

    // Verifica se o stage pertence ao funnel
    const stage = await this.crmStagesService.findOne(
      createCrmNegotiationDto.stageId,
    );
    if (stage.funnel.id !== createCrmNegotiationDto.funnelId) {
      throw new BadRequestException(
        'O estágio não pertence ao funil especificado',
      );
    }

    // Incrementa a ordem de todas as negociações do estágio
    await this.crmNegotiationRepository
      .createQueryBuilder()
      .update(CrmNegotiation)
      .set({ order: () => 'order + 1' })
      .where('stage_id = :stageId', {
        stageId: createCrmNegotiationDto.stageId,
      })
      .execute();

    // Define order como 0 para a nova negociação
    negotiationData.order = 0;

    // Trata a empresa (cria nova ou usa existente)
    if (createCrmNegotiationDto.company) {
      const company = await this.crmCompaniesService.create(
        createCrmNegotiationDto.company,
      );
      negotiationData.company = { id: company.id };
    } else if (createCrmNegotiationDto.companyId) {
      negotiationData.company = { id: createCrmNegotiationDto.companyId };
    }

    // Trata o contato (cria novo ou usa existente)
    if (createCrmNegotiationDto.contact) {
      const contact = await this.crmContactsService.create({
        ...createCrmNegotiationDto.contact,
        companyId: negotiationData.company?.id,
      });
      negotiationData.contact = { id: contact.id };
    } else if (createCrmNegotiationDto.contactId) {
      negotiationData.contact = { id: createCrmNegotiationDto.contactId };
    } else {
      throw new BadRequestException('É necessário fornecer um contato');
    }

    // Configura os relacionamentos
    negotiationData.funnel = { id: createCrmNegotiationDto.funnelId };
    negotiationData.stage = { id: createCrmNegotiationDto.stageId };
    negotiationData.owner = { id: createCrmNegotiationDto.ownerId };

    // Remove campos extras
    delete negotiationData.companyId;
    delete negotiationData.contactId;
    delete negotiationData.funnelId;
    delete negotiationData.stageId;
    delete negotiationData.ownerId;

    const negotiation =
      await this.crmNegotiationRepository.save(negotiationData);
    return this.findOne(negotiation.id);
  }

  /* --------------------------------------------------------------------- */
  /* crm-negotiations.service.ts                                           */
  /* --------------------------------------------------------------------- */
  async findAll(
    page = 1,
    limit = 10,
    filter?: string,

    /* NOVOS filtros */
    funnelId?: string,
    stageId?: string,
    ownerId?: string,
    companyId?: string,
    contactId?: string,
    origin?: string,
    isLost?: boolean,
  ): Promise<{
    data: CrmNegotiation[];
    meta: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    /* ------------------------------------------------------------------ */
    const qb = this.crmNegotiationRepository
      .createQueryBuilder('negotiation')
      .leftJoinAndSelect('negotiation.company', 'company')
      .leftJoinAndSelect('negotiation.contact', 'contact')
      .leftJoinAndSelect('negotiation.funnel', 'funnel')
      .leftJoinAndSelect('negotiation.stage', 'stage')
      .leftJoinAndSelect('negotiation.owner', 'owner');

    /* ---------- filtro "genérico" (texto livre) ----------------------- */
    if (filter) {
      qb.andWhere(
        `
        negotiation.mainInterest LIKE :f
        OR company.nomeFantasia  LIKE :f
        OR company.razaoSocial   LIKE :f
        OR contact.name          LIKE :f
        OR contact.lastname      LIKE :f
        OR negotiation.tags      LIKE :f
      `,
        { f: `%${filter}%` },
      );
    }

    /* ---------- filtros específicos (iguais) -------------------------- */
    if (funnelId) qb.andWhere('funnel.id  = :funnelId', { funnelId });
    if (stageId) qb.andWhere('stage.id   = :stageId', { stageId });
    if (ownerId) qb.andWhere('owner.id   = :ownerId', { ownerId });
    if (companyId) qb.andWhere('company.id = :companyId', { companyId });
    if (contactId) qb.andWhere('contact.id = :contactId', { contactId });

    /* ---------- origem (pode ser LIKE ou =) --------------------------- */
    if (origin)
      qb.andWhere('negotiation.origin LIKE :origin', { origin: `%${origin}%` });

    /* ---------- status de perda -------------------------------------- */
    if (typeof isLost === 'boolean')
      qb.andWhere('negotiation.isLost = :isLost', { isLost });

    /* paginação -------------------------------------------------------- */
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CrmNegotiation> {
    const negotiation = await this.crmNegotiationRepository.findOne({
      where: { id },
      relations: ['company', 'contact', 'funnel', 'stage', 'owner'],
    });
    if (!negotiation) {
      throw new NotFoundException(`Negociação com ID ${id} não encontrada`);
    }
    return negotiation;
  }

  async update(
    id: string,
    updateCrmNegotiationDto: UpdateCrmNegotiationDto,
    user: User,
  ): Promise<CrmNegotiation> {
    const negotiation: any = await this.findOne(id);
    const changes: FieldChange[] = [];

    const hasRealChange = (oldValue: any, newValue: any): boolean => {
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        return (
          JSON.stringify([...oldValue].sort()) !==
          JSON.stringify([...newValue].sort())
        );
      }
      if (oldValue instanceof Date && newValue instanceof Date) {
        return oldValue.getTime() !== new Date(newValue).getTime();
      }
      if (
        typeof oldValue === 'object' &&
        oldValue !== null &&
        typeof newValue === 'object' &&
        newValue !== null
      ) {
        return JSON.stringify(oldValue) !== JSON.stringify(newValue);
      }
      return oldValue !== newValue;
    };

    // — Exemplo de como verificar alguns campos (facilidade) —
    if ('obs' in updateCrmNegotiationDto) {
      const novoObs = updateCrmNegotiationDto.obs;
      if (hasRealChange(negotiation.obs, novoObs)) {
        changes.push({
          field: 'obs',
          oldValue: negotiation.obs,
          newValue: novoObs,
        });
        negotiation.obs = novoObs;
      }
    }

    if ('isLost' in updateCrmNegotiationDto) {
      const novoIsLost = updateCrmNegotiationDto.isLost;
      if (hasRealChange(negotiation.isLost, novoIsLost)) {
        changes.push({
          field: 'isLost',
          oldValue: negotiation.isLost,
          newValue: novoIsLost,
        });
        negotiation.isLost = novoIsLost;
      }
    }

    if ('isWon' in updateCrmNegotiationDto) {
      const novoIsWon = updateCrmNegotiationDto.isWon;
      if (hasRealChange(negotiation.isWon, novoIsWon)) {
        changes.push({
          field: 'isWon',
          oldValue: negotiation.isWon,
          newValue: novoIsWon,
        });
        negotiation.isWon = novoIsWon;
      }
    }

    if ('mainInterest' in updateCrmNegotiationDto) {
      const novoMI = updateCrmNegotiationDto.mainInterest;
      if (hasRealChange(negotiation.mainInterest, novoMI)) {
        changes.push({
          field: 'mainInterest',
          oldValue: negotiation.mainInterest,
          newValue: novoMI,
        });
        negotiation.mainInterest = novoMI;
      }
    }

    if ('stageId' in updateCrmNegotiationDto) {
      const novoStageId = updateCrmNegotiationDto.stageId;
      if (hasRealChange(negotiation.stage.id, novoStageId)) {
        const oldStage = await this.crmStagesService.findOne(
          negotiation.stage.id,
        );
        const newStage = await this.crmStagesService.findOne(novoStageId);
        changes.push({
          field: 'stageId',
          oldValue: negotiation.stage.id,
          newValue: novoStageId,
          oldName: oldStage.name,
          newName: newStage.name,
        });
        negotiation.stage = { id: novoStageId } as any;
      }
    }

    if ('funnelId' in updateCrmNegotiationDto) {
      const novoFunnelId = updateCrmNegotiationDto.funnelId;
      if (hasRealChange(negotiation.funnel.id, novoFunnelId)) {
        changes.push({
          field: 'funnelId',
          oldValue: negotiation.funnel.id,
          newValue: novoFunnelId,
        });
        negotiation.funnel = { id: novoFunnelId } as any;
      }
    }

    if ('ownerId' in updateCrmNegotiationDto) {
      const novoOwnerId = updateCrmNegotiationDto.ownerId;
      if (hasRealChange(negotiation.owner.id, novoOwnerId)) {
        changes.push({
          field: 'ownerId',
          oldValue: negotiation.owner.id,
          newValue: novoOwnerId,
        });
        negotiation.owner = { id: novoOwnerId } as any;
      }
    }

    if ('tags' in updateCrmNegotiationDto) {
      const novasTags = updateCrmNegotiationDto.tags;
      if (hasRealChange(negotiation.tags, novasTags)) {
        changes.push({
          field: 'tags',
          oldValue: negotiation.tags,
          newValue: novasTags,
        });
        negotiation.tags = novasTags;
      }
    }

    if ('companyId' in updateCrmNegotiationDto) {
      const novaCompanyId = updateCrmNegotiationDto.companyId;
      if (hasRealChange(negotiation.company.id, novaCompanyId)) {
        changes.push({
          field: 'companyId',
          oldValue: negotiation.company.id,
          newValue: novaCompanyId,
        });
        negotiation.company = { id: novaCompanyId } as any;
      }
    }

    if ('contactId' in updateCrmNegotiationDto) {
      const novoContactId = updateCrmNegotiationDto.contactId;
      if (hasRealChange(negotiation.contact.id, novoContactId)) {
        changes.push({
          field: 'contactId',
          oldValue: negotiation.contact.id,
          newValue: novoContactId,
        });
        negotiation.contact = { id: novoContactId } as any;
      }
    }

    if ('origin' in updateCrmNegotiationDto) {
      const novaOrigin = updateCrmNegotiationDto.origin;
      if (hasRealChange(negotiation.origin, novaOrigin)) {
        changes.push({
          field: 'origin',
          oldValue: negotiation.origin,
          newValue: novaOrigin,
        });
        negotiation.origin = novaOrigin;
      }
    }

    if ('order' in updateCrmNegotiationDto) {
      const novaOrder = updateCrmNegotiationDto.order;
      if (hasRealChange(negotiation.order, novaOrder)) {
        changes.push({
          field: 'order',
          oldValue: negotiation.order,
          newValue: novaOrder,
        });
        negotiation.order = novaOrder;
      }
    }

    // 4) Após coletar todos os FieldChange, gere o texto "action":
    if (changes.length > 0) {
      const textoDaAction = buildActionFromChanges(changes); // usa a função do passo anterior
      await this.crmNegotiationRepository.save(negotiation);
      await this.historyService.createHistory(id, user, textoDaAction, changes);
    }

    return negotiation;
  }

  async remove(id: string): Promise<void> {
    const result = await this.crmNegotiationRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Negociação com ID ${id} não encontrada`);
    }
  }

  async createLead(createLeadDto: CreateLeadDto): Promise<CrmNegotiation> {
    // Busca dados do CNPJ na Receita Federal apenas se o CNPJ for fornecido e não vazio
    let companyData;
    if (createLeadDto.cnpj && createLeadDto.cnpj.trim() !== '') {
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `https://receitaws.com.br/v1/cnpj/${createLeadDto.cnpj}`,
          ),
        );
        companyData = response.data;
      } catch {
        throw new BadRequestException(
          'Erro ao buscar dados do CNPJ na Receita Federal',
        );
      }
    }

    // Busca ou cria a empresa pelo CNPJ apenas se o CNPJ for fornecido e não vazio
    let company;
    if (createLeadDto.cnpj && createLeadDto.cnpj.trim() !== '') {
      company = await this.crmCompaniesService.findByCnpj(createLeadDto.cnpj);
    }

    if (!company) {
      company = await this.crmCompaniesService.create({
        cnpj:
          createLeadDto.cnpj && createLeadDto.cnpj.trim() !== ''
            ? createLeadDto.cnpj
            : null,
        razaoSocial: companyData?.nome || 'Sem CNPJ',
        nomeFantasia: companyData?.fantasia || companyData?.nome || 'Sem CNPJ',
        situacao: companyData?.situacao || 'Sem CNPJ',
        tipoEmpresa: companyData?.tipoEmpresa || 'Sem CNPJ',
        porte: companyData?.porte || 'Sem CNPJ',
        naturezaJuridica: companyData?.natureza_juridica || 'Sem CNPJ',
        capitalSocial: parseFloat(companyData?.capital_social) || 0,
        atividadePrincipal:
          companyData?.atividade_principal?.[0]?.text || 'Sem CNPJ',
        atividadesSecundarias:
          companyData?.atividades_secundarias?.map((a) => a.text) || [],
      });
    } else {
      this.logger.debug('Empresa encontrada:', company);
    }

    // Busca contato existente com dados idênticos
    let contact = await this.crmContactsService.findByExactMatch({
      name: createLeadDto.name,
      email: createLeadDto.email,
      phone: createLeadDto.phone,
      companyId: company.id,
    });

    if (!contact) {
      contact = await this.crmContactsService.create({
        name: createLeadDto.name,
        lastname: '',
        treatment: 'Sr(a)',
        role: 'Contato',
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        companyId: company.id,
      });
    } else {
      this.logger.debug('Contato existente encontrado:', contact);
    }

    // Busca o estágio e seu funil
    const stage = await this.crmStagesService.findOne(createLeadDto.stageId);

    // Busca o usuário padrão (id: "1")
    const defaultUser = await this.usersService.findDefault();

    // Atualiza a ordem de todas as negociações do estágio
    await this.crmNegotiationRepository
      .createQueryBuilder()
      .update(CrmNegotiation)
      .set({ order: () => 'order + 1' })
      .where('stage_id = :stageId', { stageId: stage.id })
      .execute();

    // Cria a negociação
    const negotiation = await this.create({
      companyId: company.id,
      contactId: contact.id,
      funnelId: stage.funnel.id,
      stageId: stage.id,
      ownerId: defaultUser.id,
      mainInterest: createLeadDto.interestService,
      obs: createLeadDto.message,
      order: 0,
      origin: createLeadDto.origin,
    } as any);

    // Envia os emails
    try {
      // Envia notificação para o admin
      await this.emailService.sendLeadNotification({
        cnpj: createLeadDto.cnpj,
        name: createLeadDto.name,
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        interestService: createLeadDto.interestService,
        message: createLeadDto.message,
      });

      // Envia confirmação para o lead
      await this.emailService.sendLeadConfirmation({
        name: createLeadDto.name,
        email: createLeadDto.email,
        interestService: createLeadDto.interestService,
      });
    } catch {
      this.logger.error('Erro ao enviar emails');
      // Não lançamos o erro para não impedir a criação do lead
    }

    return negotiation;
  }

  async findOneWithDetails(
    id: string,
  ): Promise<CrmNegotiation & { totalDuplicates: number }> {
    const negotiation = await this.crmNegotiationRepository.findOne({
      where: { id },
      relations: ['company', 'contact', 'funnel', 'stage', 'owner'],
    });
    if (!negotiation) {
      throw new NotFoundException(`Negociação com ID ${id} não encontrada`);
    }

    // Monta o where "AND" com todos os campos
    const whereClause = {
      company: { cnpj: negotiation.company.cnpj },
      contact: {
        email: negotiation.contact.email,
        phone: negotiation.contact.phone,
      },
      mainInterest: negotiation.mainInterest,
    };

    // Busca apenas registros que batem em TODOS os campos
    const duplicates = await this.crmNegotiationRepository.find({
      where: whereClause,
      relations: ['company', 'contact', 'funnel', 'stage', 'owner'],
    });

    // Remove a própria negociação da contagem
    const totalDuplicates = duplicates.filter((d) => d.id !== id).length;

    return {
      ...negotiation,
      totalDuplicates,
    };
  }

  async findDuplicates(negotiationId: string): Promise<{
    data: CrmNegotiation[];
    meta: { totalDuplicates: number; message: string };
  }> {
    // 1. Busca a negociação de referência
    const referenceNegotiation = await this.crmNegotiationRepository.findOne({
      where: { id: negotiationId },
      relations: ['company', 'contact'],
    });

    if (!referenceNegotiation) {
      throw new NotFoundException(
        `Negociação com ID ${negotiationId} não encontrada`,
      );
    }

    // 2. Monta o where "AND" com todos os campos
    const whereClause = {
      company: { cnpj: referenceNegotiation.company.cnpj },
      contact: {
        email: referenceNegotiation.contact.email,
        phone: referenceNegotiation.contact.phone,
      },
      mainInterest: referenceNegotiation.mainInterest,
    };

    // 3. Busca apenas registros que batem em TODOS os campos
    const duplicates = await this.crmNegotiationRepository.find({
      where: whereClause,
      relations: ['company', 'contact', 'funnel', 'stage', 'owner'],
      order: { createdAt: 'DESC' },
    });

    // 4. Filtra fora a própria negociação de referência
    const filtered = duplicates.filter((d) => d.id !== negotiationId);
    const total = filtered.length;

    return {
      data: filtered,
      meta: {
        totalDuplicates: total,
        message:
          total === 0
            ? 'Nenhuma duplicata encontrada'
            : `Foram encontradas ${total} possíveis duplicatas`,
      },
    };
  }

  async getHistory(
    negotiationId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verifica se a negociação existe
    await this.findOne(negotiationId);

    // Busca o histórico
    return await this.historyService.findByNegotiationId(
      negotiationId,
      page,
      limit,
    );
  }
}
