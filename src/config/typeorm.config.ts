import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/roles.entities';
import { Rule } from 'src/modules/rules/entities.rules.entity';
import { UserRole } from 'src/modules/user-role/entities/user-role.entity';
import { RoleRule } from 'src/modules/role-rule/entities/role-rule.entity';
import { Department } from 'src/modules/departments/entities/departments.entiy';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { RoleDepartment } from 'src/modules/role-department/entities/role-department.entity';
import { RoleHierarchy } from 'src/modules/role-hierarchy/entities/role-hierarchy.entity';
import { ConfirmationCode } from 'src/modules/confirmation-codes/entities/confirmation-codes.entity';
import { CompanyService } from 'src/modules/company-services/entities/company-services.entity';
import { Service } from 'src/modules/services/entities/services.entity';
import { CrmCompany } from 'src/modules/crm/companies/entities/crm-company.entity';
import { CrmContact } from 'src/modules/crm/contacts/entities/crm-contact.entity';
import { CrmTeam } from 'src/modules/crm/team/entities/crm-team.entity';
import { CrmTeamUser } from 'src/modules/crm/team/entities/crm-team-user.entity';
import { CrmFunnel } from 'src/modules/crm/funnel/entities/crm-funnel.entity';
import { CrmStage } from 'src/modules/crm/stages/entities/crm-stage.entity';
import { CrmNegotiation } from 'src/modules/crm/negotiations/entities/crm-negotiation.entity';
import { CrmNegotiationHistory } from 'src/modules/crm/negotiation-history/entities/crm-negotiation-history.entity';
import { CrmTask } from 'src/modules/crm/tasks/entities/crm-task.entity';
import { CrmTaskRecurrence } from 'src/modules/crm/tasks/entities/crm-task-recurrence.entity';
import { Notification } from 'src/modules/notifications/entities/notification.entity';
import { CrmFunnelAudit } from 'src/modules/crm/funnel/entities/crm-funnel-audit.entity';
import { InternalTask } from 'src/modules/internal-tasks/entities/internal-task.entity';
import { TaskKanban } from 'src/modules/internal-tasks/entities/task-kanban.entity';
import { TaskColumn } from 'src/modules/internal-tasks/entities/task-column.entity';
import { TaskComment } from 'src/modules/internal-tasks/entities/task-comment.entity';
import { TaskAttachment } from 'src/modules/internal-tasks/entities/task-attachment.entity';
import { Checklist } from 'src/modules/internal-tasks/entities/checklist.entity';
import { ChecklistItem } from 'src/modules/internal-tasks/entities/checklist-item.entity';
import { TaskChecklistItem } from 'src/modules/internal-tasks/entities/task-checklist-item.entity';
import { TaskTimeEntry } from 'src/modules/internal-tasks/entities/task-time-entry.entity';
import { PasswordVault } from 'src/modules/password-vault/entities/password-vault.entity';
import { PasswordEntry } from 'src/modules/password-vault/entities/password-entry.entity';
import { PasswordAccessLog } from 'src/modules/password-vault/entities/password-access-log.entity';
import { ClientFile } from 'src/modules/file-management/entities/client-file.entity';
import { ClientNotificationEmail } from 'src/modules/file-management/entities/client-notification-email.entity';
import { ClientNotificationWhatsApp } from 'src/modules/file-management/entities/client-notification-whatsapp.entity';
import { DepartmentFile } from 'src/modules/file-management/entities/department-file.entity';
import { DepartmentFolder } from 'src/modules/file-management/entities/department-folder.entity';
import { Agent } from 'src/modules/agents/entities/agent.entity';
import { Conversation } from 'src/modules/agents/entities/conversation.entity';
import { Message } from 'src/modules/agents/entities/message.entity';
import { AgentFile } from 'src/modules/agents/entities/agent-file.entity';
import { WhatsAppDevice } from 'src/modules/whatsapp/entities/whatsapp-device.entity';
import { WhatsAppThread } from 'src/modules/whatsapp/entities/whatsapp-thread.entity';
import { WhatsAppThreadMessage } from 'src/modules/whatsapp/entities/whatsapp-thread-message.entity';

dotenv.config();

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: process.env.DB_TYPE as 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    User,
    Role,
    Rule,
    Department,
    Company,
    RoleHierarchy,
    UserRole,
    RoleRule,
    RoleDepartment,
    ConfirmationCode,
    CompanyService,
    Service,
    CrmCompany,
    CrmContact,
    CrmTeam,
    CrmTeamUser,
    CrmFunnel,
    CrmStage,
    CrmNegotiation,
    CrmNegotiationHistory,
    CrmTask,
    CrmTaskRecurrence,
    CrmFunnelAudit,
    Notification,
    InternalTask,
    TaskKanban,
    TaskColumn,
    TaskComment,
    TaskAttachment,
    Checklist,
    ChecklistItem,
    TaskChecklistItem,
    TaskTimeEntry,
    PasswordVault,
    PasswordEntry,
    PasswordAccessLog,
    ClientFile,
    ClientNotificationEmail,
    ClientNotificationWhatsApp,
    DepartmentFile,
    DepartmentFolder,
    Agent,
    Conversation,
    Message,
    AgentFile,
    WhatsAppDevice,
    WhatsAppThread,
    WhatsAppThreadMessage,
  ],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: process.env.SYNCHRONIZE === 'true',
};
