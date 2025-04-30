import { UserRole } from "@prisma/client";
import type { Profile } from "@/types/profile";

/**
 * Gets the active company ID for the current user
 * - For regular users, returns their assigned company ID
 * - For superadmins, returns the selected company ID from localStorage or null
 */
export const getActiveCompanyId = (profile: Profile | null): string | null => {
  if (!profile) return null;
  
  // For regular users, return the company they're assigned to
  if (profile.role !== UserRole.SUPERADMIN) {
    return profile.companyId;
  }
  
  // For superadmins, check localStorage for selected company
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedCompanyId');
  }
  
  return null;
};

/**
 * Checks if a user has access to the dashboard
 * - Regular users need an assigned company
 * - Superadmins need to have selected a company
 */
export const canAccessDashboard = (profile: Profile | null): boolean => {
  if (!profile) return false;
  
  // Regular users need a company assignment
  if (profile.role !== UserRole.SUPERADMIN) {
    return !!profile.companyId;
  }
  
  // Superadmins need to have selected a company
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('selectedCompanyId');
  }
  
  return false;
};

/**
 * Redirects the user based on their role and company assignment
 * - Superadmins without company selection go to select-company
 * - Regular users without company assignment go to waiting-approval
 * - Users with proper access go to dashboard
 */
export const getRedirectPath = (profile: Profile | null): string => {
  if (!profile) return '/sign-in';
  
  const isSuperadmin = profile.role === UserRole.SUPERADMIN;
  const hasCompany = !!profile.companyId;
  const hasSelectedCompany = typeof window !== 'undefined' && !!localStorage.getItem('selectedCompanyId');
  
  if (isSuperadmin && !hasSelectedCompany) {
    return '/select-company';
  }
  
  if (!isSuperadmin && !hasCompany) {
    return '/waiting-approval';
  }
  
  return '/dashboard';
};

/**
 * Saves a company selection for a superadmin
 */
export const saveCompanySelection = (companyId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedCompanyId', companyId);
  }
};

/**
 * Clears a company selection for a superadmin
 */
export const clearCompanySelection = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selectedCompanyId');
  }
}; 