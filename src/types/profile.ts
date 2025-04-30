import type { UserRole } from "@prisma/client";

export interface Profile {
  id: string;
  userId: string;
  companyId?: string;
  avatarUrl?: string;
  birthDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  firstName?: string;
  lastName?: string;
  role: UserRole;
} 