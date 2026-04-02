import { IsString, Length, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'A senha antiga é obrigatória.' })
  @IsString({ message: 'A senha antiga deve ser uma string.' })
  @Length(1, 256, { message: 'A senha antiga é obrigatória.' })
  oldPassword: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @IsString({ message: 'A nova senha deve ser uma string.' })
  @Length(6, 256, {
    message: 'A nova senha deve ter entre 6 e 256 caracteres.',
  })
  password: string;
}

