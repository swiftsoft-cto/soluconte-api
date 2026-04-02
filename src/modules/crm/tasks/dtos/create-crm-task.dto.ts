import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDate,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TaskType, TaskStatus } from '../entities/crm-task.entity';
import {
  RecurrenceType,
  NotificationTime,
} from '../entities/crm-task-recurrence.entity';
import { Type, Transform } from 'class-transformer';

export class RecurrenceDto {
  @ApiProperty({
    description: 'Tipo de recorrência',
    enum: RecurrenceType,
    example: RecurrenceType.WEEKLY,
  })
  @IsEnum(RecurrenceType)
  type: RecurrenceType;

  @ApiProperty({
    description: 'Dias da semana (0-6, onde 0 é domingo)',
    example: [1, 3, 5],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @Transform(({ value }) => value.map(Number))
  weekDays?: number[];

  @ApiProperty({
    description: 'Dias do mês (1-31)',
    example: [1, 15, 25],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  @Transform(({ value }) => value.map(Number))
  monthDays?: number[];

  @ApiProperty({
    description: 'Hora do dia (0-23)',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  @Transform(({ value }) => Number(value))
  hour?: number;

  @ApiProperty({
    description: 'Minuto da hora (0-59)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  @Transform(({ value }) => Number(value))
  minute?: number;

  @ApiProperty({
    description: 'Tempo de notificação antes da tarefa',
    enum: NotificationTime,
    example: NotificationTime.FIFTEEN_MINUTES,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationTime)
  notificationTime?: NotificationTime;
}

export class CreateCrmTaskDto {
  @ApiProperty({ description: 'Título da tarefa' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Descrição da tarefa', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tipo da tarefa', enum: TaskType })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({ description: 'Data de vencimento da tarefa' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dueDate: Date;

  @IsDate()
  @Type(() => Date)
  @ApiProperty({ description: 'Data de agendamento da tarefa' })
  scheduledDate: Date;

  @ApiProperty({ description: 'Status da tarefa', enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty({ description: 'ID da negociação relacionada', required: false })
  @IsUUID()
  @IsOptional()
  negotiationId?: string;

  @ApiProperty({ description: 'ID da empresa relacionada', required: false })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'ID do contato relacionado', required: false })
  @IsUUID()
  @IsOptional()
  contactId?: string;

  @ApiProperty({ description: 'ID do responsável pela tarefa' })
  @IsString()
  ownerId: string;

  @ApiProperty({
    description: 'IDs dos usuários auxiliares da tarefa',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({ description: 'Configuração de recorrência', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}
