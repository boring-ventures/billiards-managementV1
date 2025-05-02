import { UserRole } from "@prisma/client";

/**
 * Auth metadata stored in JWT claims (app_metadata)
 */
export interface AuthMetadata {
  role: UserRole;
  companyId: string | null;
  initialized: boolean;
}

/**
 * User metadata stored in user_metadata
 */
export interface UserMetadata {
  firstName?: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Extended session user with metadata
 */
export interface MetadataUser {
  id: string;
  aud: string;
  role?: UserRole;
  email?: string;
  app_metadata: AuthMetadata;
  user_metadata: UserMetadata;
} 