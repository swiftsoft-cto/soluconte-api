import { ChecklistType } from '../entities/checklist.entity';

export class ChecklistItemResponseDto {
  id: string;
  description: string;
  observations?: string;
  order: number;
  isRequired: boolean;
  responsible?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class ChecklistResponseDto {
  id: string;
  name: string;
  description?: string;
  type: ChecklistType;
  isTemplate: boolean;
  isActive: boolean;
  department?: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  items: ChecklistItemResponseDto[];
  totalItems: number;
  completedItems: number;
  progress: number; // Percentual de conclusão
  createdAt: Date;
  updatedAt: Date;
}










