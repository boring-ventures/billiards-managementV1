import { UserRole } from "@prisma/client";

export interface Profile {
  id: string;
  userId: string;
  companyId: string | null; // Allow null for companyId to match the Prisma model
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} 