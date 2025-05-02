import { UserRole } from "@prisma/client";
import type { Profile } from "@/types/profile";
import { cookieUtils, COMPANY_SELECTION_COOKIE, VIEW_MODE_COOKIE } from "./cookie-utils";

/**
 * Gets the active company ID for the current user
 * - For regular users, returns their assigned company ID
 * - For superadmins, returns the selected company ID from cookies or null
 */
export const getActiveCompanyId = (profile: Profile | null): string | null => {
  if (!profile) return null;
  
  // For regular users, return the company they're assigned to
  if (profile.role !== UserRole.SUPERADMIN) {
    return profile.companyId;
  }
  
  // For superadmins, check cookies for selected company
  return cookieUtils.get(COMPANY_SELECTION_COOKIE) || null;
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
  return !!cookieUtils.get(COMPANY_SELECTION_COOKIE);
};

/**
 * Redirects the user based on their role and company assignment
 * - Superadmins without company selection go to company-selection
 * - Regular users without company assignment go to waiting-approval
 * - Users with proper access go to dashboard
 */
export const getRedirectPath = (profile: Profile | null): string => {
  if (!profile) return '/sign-in';
  
  const isSuperadmin = profile.role === UserRole.SUPERADMIN;
  const hasCompany = !!profile.companyId;
  const hasSelectedCompany = !!cookieUtils.get(COMPANY_SELECTION_COOKIE);
  
  if (isSuperadmin && !hasSelectedCompany) {
    return '/company-selection';
  }
  
  if (!isSuperadmin && !hasCompany) {
    return '/waiting-approval';
  }
  
  return '/dashboard';
};

/**
 * Saves a company selection for a superadmin in a cookie
 */
export const saveCompanySelection = (companyId: string): void => {
  cookieUtils.set(COMPANY_SELECTION_COOKIE, companyId, { 
    expires: 30, // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
};

/**
 * Clears a company selection for a superadmin
 */
export const clearCompanySelection = (): void => {
  cookieUtils.remove(COMPANY_SELECTION_COOKIE);
};

/**
 * Saves the current view mode for a superadmin
 */
export const saveViewMode = (viewMode: UserRole | null): void => {
  if (viewMode) {
    cookieUtils.set(VIEW_MODE_COOKIE, viewMode, {
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  } else {
    cookieUtils.remove(VIEW_MODE_COOKIE);
  }
};

/**
 * Gets the current view mode from cookie
 */
export const getViewMode = (): UserRole | null => {
  const viewMode = cookieUtils.get(VIEW_MODE_COOKIE);
  return viewMode as UserRole || null;
}; 