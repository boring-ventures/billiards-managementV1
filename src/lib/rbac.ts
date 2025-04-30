import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getActiveCompanyId } from "./authUtils";
import type { Profile } from "@/types/profile";

/**
 * Assert that the user has the required role and company context
 * Redirects to appropriate page if requirements aren't met
 */
export const assertRoleAndCompany = (
  profile: Profile | null,
  allowedRoles: UserRole[],
  redirectTo = "/dashboard"
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

  // Check if user has required role
  if (!allowedRoles.includes(profile.role)) {
    redirect(redirectTo);
  }

  return {
    companyId,
    userId: profile.id
  };
};

/**
 * Check if user has admin permissions (Admin or Superadmin)
 */
export const hasAdminPermission = (profile: Profile | null): boolean => {
  if (!profile) return false;
  return [UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(profile.role.toString());
};

/**
 * Check if user has staff permissions (Seller, Admin, or Superadmin)
 */
export const hasStaffPermission = (profile: Profile | null): boolean => {
  if (!profile) return false;
  return [UserRole.SELLER.toString(), UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(profile.role.toString());
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