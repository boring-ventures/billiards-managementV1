import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getActiveCompanyId } from "./authUtils";
import type { Profile } from "@/types/profile";

// Server-side imports - these will only be used in server context
let cookies: any;
let createRouteHandlerClient: any;

// Dynamically import server-only modules
if (typeof window === 'undefined') {
  // We're in a server context
  try {
    // Dynamic imports to prevent client-side bundling
    const importHeaders = async () => {
      const headers = await import('next/headers');
      cookies = headers.cookies;
    };
    
    const importAuthHelpers = async () => {
      const authHelpers = await import('@supabase/auth-helpers-nextjs');
      createRouteHandlerClient = authHelpers.createRouteHandlerClient;
    };
    
    // Execute the imports (no await needed here as we'll await when we use them)
    importHeaders();
    importAuthHelpers();
  } catch (error) {
    console.warn("Could not import server-only modules:", error);
  }
}

// Client-side utility to get the current effective role (considering view mode)
export const getEffectiveRole = async (profile: Profile | null, viewMode: UserRole | null): Promise<UserRole | null> => {
  if (!profile) return null;
  
  // First try to get role from JWT claims if we're server-side
  if (typeof window === 'undefined' && cookies && createRouteHandlerClient) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data } = await supabase.auth.getSession();
      
      if (data?.session?.user?.app_metadata?.role) {
        const jwtRole = data.session.user.app_metadata.role;
        
        // For superadmins with a view mode set, return the view mode
        if (jwtRole === UserRole.SUPERADMIN && viewMode) {
          return viewMode;
        }
        
        // Otherwise return the JWT role
        return jwtRole;
      }
    } catch (error) {
      console.error("Error getting role from JWT:", error);
      // Fall back to profile role
    }
  }
  
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
export const assertRoleAndCompany = async (
  profile: Profile | null,
  allowedRoles: UserRole[],
  redirectTo = "/dashboard",
  viewMode: UserRole | null = null
): Promise<{ companyId: string; userId: string }> => {
  // No profile means not authenticated
  if (!profile) {
    redirect("/auth/login");
  }

  // Get the active company ID (from profile or superadmin selection)
  const companyId = await getActiveCompanyId(profile);
  
  // Must have a company context
  if (!companyId) {
    if (profile.role === UserRole.SUPERADMIN) {
      redirect("/company-selection");
    } else {
      redirect("/waiting-approval");
    }
  }

  // Get the effective role (considering view mode for superadmins)
  const effectiveRole = await getEffectiveRole(profile, viewMode);

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
export const hasAdminPermission = async (profile: Profile | null, viewMode: UserRole | null = null): Promise<boolean> => {
  if (!profile) return false;
  
  // Get the effective role (respecting view mode)
  const effectiveRole = await getEffectiveRole(profile, viewMode);
  
  return [UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(effectiveRole?.toString() || "");
};

/**
 * Check if user has staff permissions (Seller, Admin, or Superadmin)
 * Respects view mode for superadmins
 */
export const hasStaffPermission = async (profile: Profile | null, viewMode: UserRole | null = null): Promise<boolean> => {
  if (!profile) return false;
  
  // Get the effective role (respecting view mode)
  const effectiveRole = await getEffectiveRole(profile, viewMode);
  
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