import { BaseDTO, FieldAccessMap } from './BaseDTO';

/**
 * Data Transfer Object for Profile entity
 * Implements role-based field filtering
 */
export interface ProfileDTO extends BaseDTO {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId?: string | null;
  active: boolean;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  // Add any derived or calculated fields here
  fullName?: string;
}

/**
 * Field access configuration for ProfileDTO
 * Defines which fields are accessible to which roles
 */
export const PROFILE_FIELD_ACCESS: FieldAccessMap = {
  // Fields visible to all roles
  common: ['id', 'firstName', 'lastName', 'avatarUrl', 'fullName', 'active'],
  
  // Role-specific field inclusions
  roles: {
    'USER': ['email', 'phoneNumber'],
    'STAFF': ['role'],
    'ADMIN': ['userId', 'companyId', 'createdAt', 'updatedAt'],
    'SUPERADMIN': [] // Superadmins can see everything
  },
  
  // Explicit exclusions by role
  excludeForRoles: {
    'GUEST': ['email'] // Guests cannot see email addresses
  }
}; 