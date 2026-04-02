import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmNegotiationHistory } from './entities/crm-negotiation-history.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { CrmStagesService } from '../stages/crm-stages.service';
import { CrmFunnelService } from '../funnel/crm-funnel.service';
import { UsersService } from 'src/modules/users/users.service';
import { CrmContactsService } from '../contacts/crm-contacts.service';
import { CrmCompaniesService } from '../companies/crm-companies.service';

@Injectable()
export class CrmNegotiationHistoryService {
  private readonly logger = new Logger(CrmNegotiationHistoryService.name);

  constructor(
    @InjectRepository(CrmNegotiationHistory)
    private readonly historyRepository: Repository<CrmNegotiationHistory>,
    private readonly crmStagesService: CrmStagesService,
    private readonly crmFunnelService: CrmFunnelService,
    private readonly usersService: UsersService,
    private readonly crmContactsService: CrmContactsService,
    private readonly crmCompaniesService: CrmCompaniesService,
  ) {}

  private async getRelatedNames(
    field: string,
    oldValue: string,
    newValue: string,
  ) {
    try {
      let oldName: string = null;
      let newName: string = null;

      switch (field) {
        case 'stageId':
          if (oldValue) {
            const oldStage = await this.crmStagesService.findOne(oldValue);
            oldName = oldStage.name;
          }
          if (newValue) {
            const newStage = await this.crmStagesService.findOne(newValue);
            newName = newStage.name;
          }
          break;

        case 'funnelId':
          if (oldValue) {
            const oldFunnel = await this.crmFunnelService.findOne(oldValue);
            oldName = oldFunnel.name;
          }
          if (newValue) {
            const newFunnel = await this.crmFunnelService.findOne(newValue);
            newName = newFunnel.name;
          }
          break;

        case 'ownerId':
          if (oldValue) {
            const oldOwner =
              await this.usersService.findOneWithRelations(oldValue);
            oldName = `${oldOwner.name} ${oldOwner.lastName}`;
          }
          if (newValue) {
            const newOwner =
              await this.usersService.findOneWithRelations(newValue);
            newName = `${newOwner.name} ${newOwner.lastName}`;
          }
          break;

        case 'contactId':
          if (oldValue) {
            const oldContact = await this.crmContactsService.findOne(oldValue);
            oldName = `${oldContact.name} ${oldContact.lastname}`;
          }
          if (newValue) {
            const newContact = await this.crmContactsService.findOne(newValue);
            newName = `${newContact.name} ${newContact.lastname}`;
          }
          break;

        case 'companyId':
          if (oldValue) {
            const oldCompany = await this.crmCompaniesService.findOne(oldValue);
            oldName = oldCompany.nomeFantasia;
          }
          if (newValue) {
            const newCompany = await this.crmCompaniesService.findOne(newValue);
            newName = newCompany.nomeFantasia;
          }
          break;
      }

      return { oldName, newName };
    } catch {
      return { oldName: null, newName: null };
    }
  }

  async createHistory(
    negotiationId: string,
    user: User,
    action: string,
    changes?: { field: string; oldValue: any; newValue: any }[],
  ): Promise<CrmNegotiationHistory> {
    // Filtra apenas as mudanças reais (onde oldValue !== newValue)
    const realChanges = changes?.filter(
      (change) =>
        JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue),
    );

    // Se não houver mudanças reais, não cria o histórico
    if (!realChanges || realChanges.length === 0) {
      return null;
    }

    // Processa as mudanças para incluir nomes quando necessário
    const processedChanges = await Promise.all(
      realChanges.map(async (change) => {
        const { oldName, newName } = await this.getRelatedNames(
          change.field,
          change.oldValue,
          change.newValue,
        );
        return {
          ...change,
          oldName,
          newName,
        };
      }),
    );

    const history = this.historyRepository.create({
      negotiation: { id: negotiationId },
      user,
      action,
      changes: processedChanges,
    });

    return await this.historyRepository.save(history);
  }

  async findByNegotiationId(
    negotiationId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: Array<{
      id: string;
      action: string;
      changes: {
        field: string;
        oldValue: any;
        newValue: any;
        oldName?: string;
        newName?: string;
      }[];
      createdAt: Date;
      user: {
        id: string;
        name: string;
        lastName: string;
        email: string;
        imageUrl: string | null;
      };
    }>;
    meta: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const [items, total] = await this.historyRepository.findAndCount({
      where: { negotiation: { id: negotiationId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Processa as mudanças para incluir nomes quando necessário
    const processedItems = await Promise.all(
      items.map(async (item) => {
        const processedChanges = await Promise.all(
          item.changes.map(async (change) => {
            if (!change.oldName && !change.newName) {
              const { oldName, newName } = await this.getRelatedNames(
                change.field,
                change.oldValue,
                change.newValue,
              );
              return {
                ...change,
                oldName,
                newName,
              };
            }
            return change;
          }),
        );

        return {
          id: item.id,
          action: item.action,
          changes: processedChanges,
          createdAt: item.createdAt,
          user: {
            id: item.user.id,
            name: item.user.name,
            lastName: item.user.lastName,
            email: item.user.email,
            imageUrl: item.user.imageUrl,
          },
        };
      }),
    );

    return {
      data: processedItems,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
