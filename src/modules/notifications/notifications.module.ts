import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { User } from 'src/modules/users/entities/user.entity';
import { BirthdayNotificationsJob } from 'src/jobs/birthday-notifications.job';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationsController],
  providers: [NotificationsService, BirthdayNotificationsJob],
  exports: [NotificationsService],
})
export class NotificationsModule {}
