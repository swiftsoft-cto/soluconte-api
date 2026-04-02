import { IsString, IsOptional, IsNumber } from 'class-validator';

export class StartTimeDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StopTimeDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PauseTimeDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResumeTimeDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TaskTimeEntryDto {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // em segundos
  isPaused: boolean; // se o cronômetro está pausado
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskTimeStatsDto {
  totalTime: number; // Total de tempo gasto (segundos)
  activeEntry: TaskTimeEntryDto | null; // Entrada ativa se o cronômetro estiver rodando
  entries: TaskTimeEntryDto[]; // Histórico de todas as entradas
  isRunning: boolean; // Se há um cronômetro rodando
}



