import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class PatchThreadAiDto {
  @ApiPropertyOptional()
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  agentId?: string | null;
}
