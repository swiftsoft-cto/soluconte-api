import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrmTaskRecurrence,
  RecurrenceType,
  NotificationTime,
} from 'src/modules/crm/tasks/entities/crm-task-recurrence.entity';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import {
  NotificationType,
  NotificationStatus,
} from 'src/modules/notifications/entities/notification.entity';
import {
  CrmTask,
  TaskStatus,
} from 'src/modules/crm/tasks/entities/crm-task.entity';

@Injectable()
export class TaskRecurrenceJob {
  private readonly logger = new Logger(TaskRecurrenceJob.name);

  constructor(
    @InjectRepository(CrmTaskRecurrence)
    private readonly recRepo: Repository<CrmTaskRecurrence>,
    @InjectRepository(CrmTask)
    private readonly taskRepo: Repository<CrmTask>,
    private readonly notificationsService: NotificationsService,
  ) {
    this.logger.log('TaskRecurrenceJob initialized');
  }

  /** Converte enum NotificationTime → minutos */
  private offsetMinutes(time?: NotificationTime): number {
    switch (time) {
      case NotificationTime.FIVE_MINUTES:
        return 5;
      case NotificationTime.TEN_MINUTES:
        return 10;
      case NotificationTime.FIFTEEN_MINUTES:
        return 15;
      case NotificationTime.THIRTY_MINUTES:
        return 30;
      case NotificationTime.ONE_HOUR:
        return 60;
      case NotificationTime.ONE_HOUR_THIRTY:
        return 90;
      case NotificationTime.TWO_HOURS:
        return 120;
      case NotificationTime.THREE_HOURS:
        return 180;
      default:
        return 0;
    }
  }

  onModuleInit() {
    console.log('TaskRecurrenceJob carregado ✔️');
  }

  private sameMinute(a: Date, b: Date): boolean {
    return Math.abs(a.getTime() - b.getTime()) < 60_000;
  }

  private weekOfYear(date: Date): number {
    const jan4 = new Date(date.getFullYear(), 0, 4);
    const msWeek = 86_400_000 * 7;
    return Math.floor((date.getTime() - jan4.getTime()) / msWeek) + 1;
  }

  /** Calcula a próxima ocorrência a partir de "from" */
  private nextOccurrence(rec: CrmTaskRecurrence, from: Date): Date | null {
    const { type, weekDays, monthDays, hour = 0, minute = 0 } = rec;
    const base = new Date(from);
    base.setSeconds(0, 0);

    /* WEEKLY ------------------------------------------------------------- */
    if (type === RecurrenceType.WEEKLY) {
      const weekDaysNum = (weekDays ?? []).map(Number);
      for (let i = 0; i < 7; i++) {
        const candidate = new Date(base);
        candidate.setDate(base.getDate() + i);
        if (weekDaysNum.includes(candidate.getDay())) {
          candidate.setHours(hour, minute, 0, 0);
          // Ajuste para GMT-3
          candidate.setHours(candidate.getHours());
          if (candidate >= from) return candidate;
        }
      }
    }

    /* BIWEEKLY ----------------------------------------------------------- */
    if (type === RecurrenceType.BIWEEKLY) {
      const createdWeek = this.weekOfYear(rec.createdAt ?? base);
      for (let i = 0; i < 14; i++) {
        const candidate = new Date(base);
        candidate.setDate(base.getDate() + i);
        if (
          (weekDays ?? []).map(Number).includes(candidate.getDay()) &&
          (this.weekOfYear(candidate) - createdWeek) % 2 === 0
        ) {
          candidate.setHours(hour, minute, 0, 0);
          candidate.setHours(candidate.getHours());
          if (candidate >= from) return candidate;
        }
      }
    }

    /* MONTHLY ------------------------------------------------------------ */
    if (type === RecurrenceType.MONTHLY) {
      const days = [...(monthDays ?? [])].sort((a, b) => a - b);
      // mês corrente
      for (const day of days) {
        const candidate = new Date(
          from.getFullYear(),
          from.getMonth(),
          day,
          hour,
          minute,
          0,
          0,
        );
        // Ajuste para GMT-3
        candidate.setHours(candidate.getHours());
        if (candidate >= from) return candidate;
      }
      // próximo mês
      for (const day of days) {
        return new Date(
          from.getFullYear(),
          from.getMonth() + 1,
          day,
          hour,
          minute,
          0,
          0,
        );
      }
    }
    return null;
  }

  /** Cria notificação para owner + auxiliares, evitando duplicados */
  private async createNotificationsForTask(
    rec: CrmTaskRecurrence,
    scheduledAt: Date,
  ): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: rec.task.id },
      relations: ['owner', 'auxiliaryUsers'],
    });
    if (!task || task.status === TaskStatus.CANCELED) return;

    const users = [task.owner, ...(task.auxiliaryUsers ?? [])];

    for (const user of users.filter(Boolean)) {
      const already = await this.notificationsService.exists({
        referenceType: 'crm_task',
        referenceId: task.id,
        userId: user.id,
        scheduledAt,
      });
      if (already) continue;

      await this.notificationsService.create({
        type: NotificationType.CRM_TASK,
        title: `Tarefa em breve: ${task.title}`,
        message: `Sua tarefa "${task.title}" inicia às ${rec.hour
          ?.toString()
          .padStart(2, '0')}:${rec.minute?.toString().padStart(2, '0')}.`,
        referenceType: 'crm_task',
        referenceId: task.id,
        userId: user.id,
        scheduledAt,
        status: NotificationStatus.PENDING,
      });
    }
  }

  private async createExpiredNotificationForTask(
    rec: CrmTaskRecurrence,
  ): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: rec.task.id },
      relations: ['owner', 'auxiliaryUsers'],
    });
    if (!task || task.status === TaskStatus.CANCELED) return;
    if (!task || task.status === TaskStatus.COMPLETED) return;

    const users = [task.owner, ...(task.auxiliaryUsers ?? [])];
    const now = new Date();

    for (const user of users.filter(Boolean)) {
      // Verifica se já existe notificação de vencimento para evitar spam
      const alreadyExpired = await this.notificationsService.exists({
        referenceType: 'crm_task_expired',
        referenceId: task.id,
        userId: user.id,
      });

      if (alreadyExpired) continue;

      await this.notificationsService.create({
        type: NotificationType.CRM_TASK,
        title: `Recorrência vencida: ${task.title}`,
        message: `A recorrência da tarefa "${task.title}" venceu em ${task.dueDate?.toLocaleDateString('pt-BR')}.`,
        referenceType: 'crm_task_expired',
        referenceId: task.id,
        userId: user.id,
        scheduledAt: now,
        status: NotificationStatus.PENDING,
      });
    }
  }

  /* -------------------------------------------------------------------- */
  /* -------------------------------------------------------------------- */
  @Cron('*/5 * * * * *') // a cada 5 segundos
  async handle(): Promise<void> {
    const now = new Date();

    /* 1. Busca TODAS as recorrências ativas ----------------------------- */
    const recurrences = await this.recRepo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.task', 'task')
      .where('task.status != :canceled', { canceled: TaskStatus.CANCELED })
      .getMany();

    /* 2. Para cada recorrência, verifica TODAS as ocorrências cujo aviso
              cai no mesmo minuto da execução -------------------------------- */
    for (const rec of recurrences) {
      const task = rec.task;
      // console.log('task', task);
      // console.log('🔄 Verificando recorrência:', rec.task.dueDate);
      // Verifica se a tarefa tem data de vencimento e se já venceu
      if (task.dueDate && now > task.dueDate) {
        // console.log('entrei aqui', task.dueDate, now);
        // Tarefa venceu - criar notificação de vencimento
        await this.createExpiredNotificationForTask(rec);
        continue; // Pula para a próxima recorrência
      }

      let cursor = now; // ponto de partida da busca

      while (true) {
        const nextExec = this.nextOccurrence(rec, cursor);
        if (!nextExec) break; // não há mais ocorrências futuras

        const notifyAt = new Date(
          nextExec.getTime() -
            this.offsetMinutes(rec.notificationTime) * 60_000,
        );

        // se o aviso é “agora”, cria notificação
        if (this.sameMinute(notifyAt, now)) {
          await this.createNotificationsForTask(rec, notifyAt);

          // avança 1 segundo para achar a próxima ocorrência, se existir
          cursor = new Date(nextExec.getTime() + 1_000);
          continue;
        }

        // se já saiu da janela de 1 minuto, não precisa continuar
        break;
      }
    }
  }
}
