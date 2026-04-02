import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDate,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { TaskType, TaskStatus } from '../entities/crm-task.entity';
import { CreateCrmTaskDto } from './create-crm-task.dto';
import { Type } from 'class-transformer';
import { NotificationTime } from '../entities/crm-task-recurrence.entity';

export class UpdateCrmTaskDto extends PartialType(CreateCrmTaskDto) {
  @ApiProperty({ description: 'Título da tarefa', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Descrição da tarefa', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Tipo da tarefa',
    enum: TaskType,
    required: false,
  })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiProperty({
    description: 'Status da tarefa',
    enum: TaskStatus,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ description: 'Data de vencimento da tarefa', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiProperty({
    description: 'Data de agendamento da tarefa',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDate?: Date;

  @ApiProperty({ description: 'Datas recorrentes da tarefa', required: false })
  @IsArray()
  @IsOptional()
  recurringDates?: string[];

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

  @ApiProperty({ description: 'ID do owner da tarefa', required: false })
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiProperty({
    description: 'IDs dos usuários relacionados à tarefa',
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  userIds?: string[];

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
