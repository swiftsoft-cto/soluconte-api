import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @Length(1, 256, { message: 'O nome deve ter pelo menos 1 caractere.' })
  name: string;

  @IsString()
  @Length(1, 256, { message: 'O sobrenome deve ter pelo menos 1 caractere.' })
  lastName: string;

  @IsString()
  @Length(1, 256, { message: 'O email deve ter pelo menos 1 caractere.' })
  email: string;

  // Os demais campos são opcionais e se forem string vazia serão transformados em undefined
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  document?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  countryCode?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  roleId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  postalCode?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  address?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  addressNumber?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  addressComplement?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  city?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  state?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  country?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  // Para senha, se a string for vazia, transforma em undefined
  @IsOptional()
  @IsString()
  @Length(6, 256, {
    message: 'A nova senha deve ter entre 6 e 256 caracteres.',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  password?: string;

  // Senha antiga – opcional em update
  @IsOptional()
  @IsString()
  @Length(6, 256, {
    message: 'A senha antiga deve ter entre 6 e 256 caracteres.',
  })
  oldPassword?: string;
}
