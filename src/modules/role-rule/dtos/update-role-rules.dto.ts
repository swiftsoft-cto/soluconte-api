import { IsObject, ValidateNested, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class RuleToggleDto {
  @IsString()
  id: string;

  @IsBoolean()
  active: boolean;
}

class PermissionRulesDto {
  @ValidateNested({ each: true })
  @Type(() => RuleToggleDto)
  rules: RuleToggleDto[];
}

export class UpdateRoleRulesDto {
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => PermissionRulesDto)
  permissions: Record<string, PermissionRulesDto>;
}
