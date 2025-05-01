import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getActiveCompanyId } from "./authUtils";
import type { Profile } from "@/types/profile";

// Client-side utility to get the current effective role (considering view mode)
export const getEffectiveRole = (profile: Profile | null, viewMode: UserRole | null): UserRole | null => {
  if (!profile) return null;
  
  // For superadmins with a view mode set, return the view mode
  if (profile.role === UserRole.SUPERADMIN && viewMode) {
    return viewMode;
  }
  
  // Otherwise return the actual role
  return profile.role;
};

/**
 * Assert that the user has the required role and company context
 * Redirects to appropriate page if requirements aren't met
 */
export const assertRoleAndCompany = (
  profile: Profile | null,
  allowedRoles: UserRole[],
  redirectTo = "/dashboard",
  viewMode: UserRole | null = null
): { companyId: string; userId: string } => {
  // No profile means not authenticated
  if (!profile) {
    redirect("/auth/login");
  }

  // Get the active company ID (from profile or superadmin selection)
  const companyId = getActiveCompanyId(profile);
  
  // Must have a company context
  if (!companyId) {
    if (profile.role === UserRole.SUPERADMIN) {
      redirect("/company-selection");
    } else {
      redirect("/waiting-approval");
    }
  }

  // Get the effective role (considering view mode for superadmins)
  const effectiveRole = getEffectiveRole(profile, viewMode);

  // Check if user has required role
  if (!allowedRoles.includes(effectiveRole as UserRole)) {
    redirect(redirectTo);
  }

  return {
    companyId,
    userId: profile.id
  };
};

/**
 * Check if user has admin permissions (Admin or Superadmin)
 * Respects view mode for superadmins
 */
export const hasAdminPermission = (profile: Profile | null, viewMode: UserRole | null = null): boolean => {
  if (!profile) return false;
  
  // Get the effective role (respecting view mode)
  const effectiveRole = getEffectiveRole(profile, viewMode);
  
  return [UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(effectiveRole?.toString() || "");
};

/**
 * Check if user has staff permissions (Seller, Admin, or Superadmin)
 * Respects view mode for superadmins
 */
export const hasStaffPermission = (profile: Profile | null, viewMode: UserRole | null = null): boolean => {
  if (!profile) return false;
  
  // Get the effective role (respecting view mode)
  const effectiveRole = getEffectiveRole(profile, viewMode);
  
  return [UserRole.SELLER.toString(), UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(effectiveRole?.toString() || "");
};

/**
 * Temporary API auth check until proper auth is implemented
 * For demonstration purposes only
 */
export const hasApiPermission = (user: any): boolean => {
  // For API routes, we temporarily allow all authenticated users
  // This is a placeholder until proper auth is implemented
  return !!user;
} 