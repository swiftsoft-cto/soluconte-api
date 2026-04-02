import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { LanguageMiddleware } from './common/middlewares/language.middleware';
import { I18nModule } from './modules/i18n/i18n.module';
import { SeedModule } from './seeds/seed.module';
import { ReceitaModule } from './modules/receita-federal/receita-federal.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RoleRuleModule } from './modules/role-rule/role-rule.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { ServicesModule } from './modules/services/services.module';
import { StorageModule } from './modules/storage/storage.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CompanyServicesModule } from './modules/company-services/company-services.module';
import { CrmModule } from './modules/crm/crm.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CrmDashboardModule } from './modules/crm/dashboard/crm-dashboard.module';
import { InternalTasksModule } from './modules/internal-tasks/internal-tasks.module';
import { PasswordVaultModule } from './modules/password-vault/password-vault.module';
import { UserActivityModule } from './common/interceptors/user-activity.module';
import { FileManagementModule } from './modules/file-management/file-management.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AgentsModule } from './modules/agents/agents.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(typeOrmConfig),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    PdfModule,
    RoleRuleModule,
    CompanyServicesModule,
    ServicesModule,
    ReceitaModule,
    I18nModule,
    SeedModule,
    CompaniesModule,
    CompanyServicesModule,
    StorageModule,
    CrmModule,
    CrmDashboardModule,
    InternalTasksModule,
    PasswordVaultModule,
    UserActivityModule,
    FileManagementModule,
    WhatsAppModule,
    AgentsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LanguageMiddleware).forRoutes('*');
  }
}
