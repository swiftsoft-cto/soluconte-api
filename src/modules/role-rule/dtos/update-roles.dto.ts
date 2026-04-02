import {
  IsArray,
  IsObject,
  ValidateNested,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RuleToggleDto {
  @IsString()
  id: string;

  @IsBoolean()
  active: boolean;
}

export class PermissionRulesDto {
  @ValidateNested({ each: true })
  @Type(() => RuleToggleDto)
  rules: RuleToggleDto[];
}

export class UpdateRoleItemDto {
  @IsString()
  id: string;

  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => PermissionRulesDto)
  permissions: Record<string, PermissionRulesDto>;
}

export class UpdateRolesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRoleItemDto)
  items: UpdateRoleItemDto[];
}
