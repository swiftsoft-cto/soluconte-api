import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { User } from 'src/modules/users/entities/user.entity';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import {
  NotificationType,
  NotificationStatus,
} from 'src/modules/notifications/entities/notification.entity';

@Injectable()
export class BirthdayNotificationsJob {
  private readonly logger = new Logger(BirthdayNotificationsJob.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('BirthdayNotificationsJob initialized');
    console.log('BirthdayNotificationsJob carregado ✔️');
  }

  /**
   * Executa todo dia às 8h da manhã para verificar aniversários
   * Padrão Cron: '0 8 * * *' (minuto hora dia mês dia-da-semana)
   */
  @Cron('0 8 * * *')
  async handleBirthdayNotifications(): Promise<void> {
    this.logger.log('🎂 Iniciando verificação de aniversários...');

    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1; // JavaScript months são 0-indexed

      // Buscar usuários que fazem aniversário hoje
      const birthdayUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('MONTH(user.birthdate) = :month', { month })
        .andWhere('DAY(user.birthdate) = :day', { day })
        .andWhere('user.birthdate IS NOT NULL')
        .getMany();

      if (birthdayUsers.length === 0) {
        this.logger.log('📅 Nenhum aniversariante hoje.');
        return;
      }

      this.logger.log(
        `🎉 Encontrados ${birthdayUsers.length} aniversariante(s) hoje!`,
      );

      // Buscar todos os usuários para notificar sobre os aniversários
      const allUsers = await this.userRepository.find();

      for (const birthdayUser of birthdayUsers) {
        const age = this.calculateAge(birthdayUser.birthdate);

        // 1. Notificar o próprio aniversariante
        await this.createBirthdayNotificationForUser(birthdayUser, age);

        // 2. Notificar todos os outros colaboradores sobre o aniversário
        await this.notifyColleaguesAboutBirthday(
          birthdayUser,
          age,
          allUsers,
        );
      }

      this.logger.log(
        `✅ Notificações de aniversário enviadas com sucesso!`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Erro ao processar notificações de aniversário:',
        error,
      );
    }
  }

  /**
   * Cria notificação para o aniversariante
   */
  private async createBirthdayNotificationForUser(
    user: User,
    age: number,
  ): Promise<void> {
    try {
      // Verificar se já existe notificação de aniversário hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alreadyExists = await this.notificationsService.exists({
        referenceType: 'user_birthday',
        referenceId: user.id,
        userId: user.id,
        scheduledAt: today,
      });

      if (alreadyExists) {
        this.logger.log(
          `⚠️ Notificação de aniversário para ${user.name} já existe hoje.`,
        );
        return;
      }

      await this.notificationsService.create({
        type: NotificationType.BIRTHDAY,
        title: `🎉 Feliz Aniversário!`,
        message: `Feliz aniversário, ${user.name}! Parabéns pelos seus ${age} anos! 🎂🎈 Que este novo ano seja repleto de conquistas e felicidade!`,
        referenceType: 'user_birthday',
        referenceId: user.id,
        userId: user.id,
        scheduledAt: today,
        status: NotificationStatus.PENDING,
      });

      this.logger.log(
        `✅ Notificação enviada para ${user.name} (${age} anos)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro ao criar notificação para ${user.name}:`,
        error,
      );
    }
  }

  /**
   * Notifica outros colaboradores sobre o aniversário
   */
  private async notifyColleaguesAboutBirthday(
    birthdayUser: User,
    age: number,
    allUsers: User[],
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const colleague of allUsers) {
      // Não notificar o próprio aniversariante
      if (colleague.id === birthdayUser.id) continue;

      try {
        // Verificar se já existe notificação
        const alreadyExists = await this.notificationsService.exists({
          referenceType: 'colleague_birthday',
          referenceId: birthdayUser.id,
          userId: colleague.id,
          scheduledAt: today,
        });

        if (alreadyExists) continue;

        await this.notificationsService.create({
          type: NotificationType.BIRTHDAY,
          title: `🎂 Aniversário de ${birthdayUser.name}`,
          message: `Hoje é aniversário do(a) ${birthdayUser.name}! Ele(a) está completando ${age} anos. Não esqueça de parabenizar! 🎉`,
          referenceType: 'colleague_birthday',
          referenceId: birthdayUser.id,
          userId: colleague.id,
          scheduledAt: today,
          status: NotificationStatus.PENDING,
        });
      } catch (error) {
        this.logger.error(
          `❌ Erro ao notificar ${colleague.name} sobre aniversário de ${birthdayUser.name}:`,
          error,
        );
      }
    }
  }

  /**
   * Calcula a idade baseado na data de nascimento
   */
  private calculateAge(birthdate: Date): number {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Ajustar se ainda não fez aniversário este ano
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }
}



























