import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsInt,
  IsBoolean,
} from 'class-validator';
import {
  TaskPriority,
  InternalTaskRecurrenceType,
} from '../entities/internal-task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  coResponsibleId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assistantIds?: string[];

  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsString()
  checklistId?: string; // ID do checklist a ser associado à tarefa

  @IsOptional()
  @IsString()
  serviceId?: string; // ID do serviço a ser associado à tarefa

  // Campos de recorrência
  @IsOptional()
  @IsBoolean()
  isRecurrent?: boolean;

  @IsOptional()
  @IsEnum(InternalTaskRecurrenceType)
  recurrenceType?: InternalTaskRecurrenceType;

  @IsOptional()
  @IsInt()
  recurrenceInterval?: number;

  @IsOptional()
  @IsInt()
  recurrenceDayOfMonth?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recurrenceDaysOfWeek?: string[];

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsBoolean()
  isGlobalRecurrent?: boolean;

  // Template fields (edição)
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateDescription?: string;

  @IsOptional()
  @IsString()
  templateScope?: 'personal' | 'company' | 'global';
}
