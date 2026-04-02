import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalTasksService } from './internal-tasks.service';
import { InternalTasksController } from './internal-tasks.controller';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { InternalTasksDashboardController } from './internal-tasks-dashboard.controller';
import { InternalTasksDashboardService } from './internal-tasks-dashboard.service';
import { InternalTask } from './entities/internal-task.entity';
import { TaskKanban } from './entities/task-kanban.entity';
import { TaskColumn } from './entities/task-column.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { Checklist } from './entities/checklist.entity';
import { ChecklistItem } from './entities/checklist-item.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { TaskTimeEntry } from './entities/task-time-entry.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/departments.entiy';
import { Company } from '../companies/entities/companies.entity';
import { Service } from '../services/entities/services.entity';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { TaskReportsJob } from 'src/jobs/task-reports.job';
import { InternalTasksRecurrenceJob } from 'src/jobs/internal-tasks-recurrence.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InternalTask,
      TaskKanban,
      TaskColumn,
      TaskComment,
      TaskAttachment,
      Checklist,
      ChecklistItem,
      TaskChecklistItem,
      TaskTimeEntry,
      User,
      Department,
      Company,
      Service,
    ]),
    StorageModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [InternalTasksController, ChecklistController, InternalTasksDashboardController],
  providers: [InternalTasksService, ChecklistService, InternalTasksDashboardService, TaskReportsJob, InternalTasksRecurrenceJob],
  exports: [InternalTasksService, ChecklistService, InternalTasksDashboardService],
})
export class InternalTasksModule {}
