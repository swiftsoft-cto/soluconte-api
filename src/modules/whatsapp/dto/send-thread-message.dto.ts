import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendThreadMessageDto {
  @ApiProperty({ example: 'Olá, posso ajudar?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text: string;
}
