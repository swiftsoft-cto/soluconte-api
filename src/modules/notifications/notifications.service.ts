import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
} from './entities/notification.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { sendNotificationToUser } from '../../websocket/ws/notifications.websocket';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Cria uma notificação.
   * Aceita:
   *  • user   (entidade)  **ou**
   *  • userId (string)
   */
  async create(
    data: Partial<Notification> & { userId?: string },
  ): Promise<Notification> {
    const entity = this.notificationRepository.create(data);

    // converte userId em relação Many-To-One
    if (!entity.user && data.userId) {
      entity.user = await this.userRepository.findOne({
        where: { id: data.userId },
      });
    }

    // defaults
    if (!entity.status) entity.status = NotificationStatus.PENDING;
    if (!entity.channel) entity.channel = NotificationChannel.IN_APP;

    const notification = await this.notificationRepository.save(entity);

    // Envia a notificação via WebSocket se houver userId
    if (data.userId) {
      sendNotificationToUser(data.userId, notification);
    }

    return notification;
  }

  /**
   * Verifica se já existe notificação idêntica
   * (útil para evitar duplicidade em jobs).
   */
  async exists(filter: {
    referenceType: string;
    referenceId: string;
    userId: string;
    scheduledAt?: Date;
  }): Promise<boolean> {
    const count = await this.notificationRepository.count({
      where: {
        referenceType: filter.referenceType,
        referenceId: filter.referenceId,
        user: { id: filter.userId },
        scheduledAt: filter.scheduledAt,
      },
    });
    return count > 0;
  }

  /* ---------- CRUD / LISTAGEM --------------------------------------- */

  async findAll(query: any) {
    const { page = 1, limit = 10, userId, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user');

    if (userId) qb.andWhere('user.id = :userId', { userId });
    if (status) qb.andWhere('notification.status = :status', { status });

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('notification.scheduledAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Notification> {
    return this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    await this.notificationRepository.update(id, data);
    return this.findOne(id);
  }

  async markAsSent(id: string): Promise<Notification> {
    return this.update(id, {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.update(id, {
      status: NotificationStatus.READ,
    });
  }

  async remove(id: string): Promise<void> {
    await this.notificationRepository.delete(id);
  }
}
