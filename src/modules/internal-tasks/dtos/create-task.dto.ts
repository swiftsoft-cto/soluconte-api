import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsBoolean,
  IsInt,
} from 'class-validator';
import {
  TaskPriority,
  InternalTaskRecurrenceType,
} from '../entities/internal-task.entity';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

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

  @IsString()
  departmentId: string;

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

  @IsString()
  kanbanId: string;

  @IsString()
  columnId: string;

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
  recurrenceDayOfMonth?: number; // Dia do mês (1-31)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recurrenceDaysOfWeek?: string[]; // Dias da semana como array de strings

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsBoolean()
  isGlobalRecurrent?: boolean; // Se é tarefa padrão global ou por cliente

  // Template fields (entrada)
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

  // Criar a partir de template
  @IsOptional()
  @IsString()
  templateId?: string;
}
