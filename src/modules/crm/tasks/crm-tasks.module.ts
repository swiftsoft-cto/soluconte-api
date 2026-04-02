import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmTask } from './entities/crm-task.entity';
import { CrmNegotiation } from '../negotiations/entities/crm-negotiation.entity';
import { CrmCompany } from '../companies/entities/crm-company.entity';
import { CrmContact } from '../contacts/entities/crm-contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { CrmTasksService } from './crm-tasks.service';
import { CrmTasksController } from './crm-tasks.controller';
import { CrmTaskRecurrence } from './entities/crm-task-recurrence.entity';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { TaskRecurrenceJob } from 'src/jobs/task-recurrence.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrmTask,
      CrmNegotiation,
      CrmCompany,
      CrmContact,
      User,
      CrmTaskRecurrence,
    ]),
    NotificationsModule,
  ],
  controllers: [CrmTasksController],
  providers: [CrmTasksService, TaskRecurrenceJob],
  exports: [CrmTasksService],
})
export class CrmTasksModule {}
