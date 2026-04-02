export class PasswordVaultResponseDto {
  id: string;
  name: string;
  description?: string;
  company: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  entriesCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PasswordEntryResponseDto {
  id: string;
  title: string;
  description?: string;
  username: string;
  url?: string;
  notes?: string;
  isRestricted: boolean;
  vault: {
    id: string;
    name: string;
    company: {
      id: string;
      name: string;
    };
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class PasswordAccessLogResponseDto {
  id: string;
  action: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}


































