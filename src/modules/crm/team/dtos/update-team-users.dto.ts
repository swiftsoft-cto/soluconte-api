import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateTeamUsersDto {
  @ApiProperty({
    description: 'Lista de IDs dos usuários',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
