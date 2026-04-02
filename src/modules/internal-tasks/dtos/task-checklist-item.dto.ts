import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateTaskChecklistItemDto {
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TaskChecklistItemResponseDto {
  id: string;
  isCompleted: boolean;
  completedAt?: Date;
  notes?: string;
  checklistItem: {
    id: string;
    description: string;
    observations?: string;
    order: number;
    dueDate?: Date;
    isRequired: boolean;
    responsible?: {
      id: string;
      name: string;
      email: string;
    };
  };
  completedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class TaskChecklistProgressDto {
  totalItems: number;
  completedItems: number;
  progress: number; // Percentual de conclusão
  requiredItemsCompleted: boolean; // Se todos os itens obrigatórios foram concluídos
  canCompleteTask: boolean; // Se a tarefa pode ser marcada como concluída
}


































