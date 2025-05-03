/**
 * Profile model representing a user profile in the system
 */
export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId: string | null;
  active: boolean;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
} 