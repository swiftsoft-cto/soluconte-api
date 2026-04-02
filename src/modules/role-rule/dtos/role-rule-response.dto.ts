export class RuleDto {
  id: string;
  description: string;
  rule: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class PermissionDto {
  label: string;
  rules: RuleDto[];
}

export class RolePermissionDto {
  id: string;
  name: string;
  permissions: Record<string, PermissionDto>;
}
