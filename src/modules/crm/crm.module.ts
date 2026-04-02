import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmCompaniesModule } from './companies/crm-companies.module';
import { CrmContactsModule } from './contacts/crm-contacts.module';
import { CrmFunnelModule } from './funnel/crm-funnel.module';
import { CrmStagesModule } from './stages/crm-stages.module';
import { CrmNegotiationsModule } from './negotiations/crm-negotiations.module';
import { CrmTasksModule } from './tasks/crm-tasks.module';
import { CrmTeamModule } from './team/crm-team.module';
import { CrmDashboardModule } from './dashboard/crm-dashboard.module';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/companies.entity';
import { CrmCompany } from './companies/entities/crm-company.entity';
import { CrmContact } from './contacts/entities/crm-contact.entity';
import { CrmFunnel } from './funnel/entities/crm-funnel.entity';
import { CrmStage } from './stages/entities/crm-stage.entity';
import { CrmNegotiation } from './negotiations/entities/crm-negotiation.entity';
import { CrmTask } from './tasks/entities/crm-task.entity';
import { CrmTeam } from './team/entities/crm-team.entity';
import { CrmTeamUser } from './team/entities/crm-team-user.entity';
import { CrmNegotiationHistory } from './negotiation-history/entities/crm-negotiation-history.entity';
import { CrmTaskRecurrence } from './tasks/entities/crm-task-recurrence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Company,
      CrmCompany,
      CrmContact,
      CrmFunnel,
      CrmStage,
      CrmNegotiation,
      CrmTask,
      CrmTeam,
      CrmTeamUser,
      CrmNegotiationHistory,
      CrmTaskRecurrence,
    ]),
    CrmCompaniesModule,
    CrmContactsModule,
    CrmFunnelModule,
    CrmStagesModule,
    CrmNegotiationsModule,
    CrmTasksModule,
    CrmTeamModule,
    CrmDashboardModule,
  ],
  exports: [
    CrmCompaniesModule,
    CrmContactsModule,
    CrmFunnelModule,
    CrmStagesModule,
    CrmNegotiationsModule,
    CrmTasksModule,
    CrmTeamModule,
    CrmDashboardModule,
  ],
})
export class CrmModule {}
