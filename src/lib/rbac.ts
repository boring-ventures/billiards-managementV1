import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getActiveCompanyId } from "./authUtils";
import type { Profile } from "@/types/profile";
import { Session, User } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";

// Server-side imports - these will only be used in server context
let cookies: any;
let createServerClient: any;

// Dynamically import server-only modules
if (typeof window === 'undefined') {
  // We're in a server context
  try {
    // Dynamic imports to prevent client-side bundling
    const importHeaders = async () => {
      const headers = await import('next/headers');
      cookies = headers.cookies;
    };
    
    const importSSR = async () => {
      const ssr = await import('@supabase/ssr');
      createServerClient = ssr.createServerClient;
    };
    
    // Execute the imports (no await needed here as we'll await when we use them)
    importHeaders();
    importSSR();
  } catch (error) {
    console.warn("Could not import server-only modules:", error);
  }
}

// Client-side utility to get the current effective role (considering view mode)
export const getEffectiveRole = async (profile: Profile | null, viewMode: UserRole | null): Promise<UserRole | null> => {
  if (!profile) return null;
  
  // First try to get role from JWT claims if we're server-side
  if (typeof window === 'undefined' && cookies && createServerClient) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get: (name: string) => {
              const cookieStore = cookies();
              return cookieStore.get(name)?.value || null;
            },
            set: () => {}, // Not needed for read-only operation
            remove: () => {}, // Not needed for read-only operation
          }
        }
      );
      
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
 * Check if the user is a SUPERADMIN
 * 
 * @param user User object from Supabase Auth
 * @returns boolean indicating if the user is a SUPERADMIN
 */
export function isSuperAdmin(user: User | Session["user"] | null | undefined): boolean {
  if (!user) return false;
  
  // Check in app_metadata first (most reliable)
  if (user.app_metadata?.role === "SUPERADMIN") {
    return true;
  }
  
  // Fallback to user_metadata if needed
  if (user.user_metadata?.role === "SUPERADMIN") {
    return true;
  }
  
  // Check in session claims if they exist (JWT payload)
  if (user.role === "SUPERADMIN") {
    return true;
  }
  
  // Not a SUPERADMIN
  return false;
}

/**
 * Check if user has permission to access API endpoints within a company context
 * 
 * @param user User object from Supabase Auth
 * @param requiredCompanyId Optional company ID to check against
 * @returns boolean indicating if user has permission
 */
export async function hasApiPermission(
  user: User | Session["user"] | null | undefined,
  requiredCompanyId?: string | null
): Promise<boolean> {
  if (!user) return false;
  
  // SUPERADMINs can access any company's data
  if (isSuperAdmin(user)) {
    console.log(`[RBAC] SUPERADMIN ${user.id} granted access to API endpoint ${requiredCompanyId ? `for company ${requiredCompanyId}` : ''}`);
    return true;
  }
  
  // If no specific company required, basic authenticated access is enough for regular users
  if (!requiredCompanyId) {
    return true;
  }
  
  try {
    // For non-superadmins, check if they belong to the requested company
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { companyId: true, role: true }
    });
    
    if (!profile) {
      console.log(`[RBAC] User ${user.id} has no profile, denying access`);
      return false;
    }
    
    // Company admins can access their company's data
    if (profile.role === UserRole.ADMIN && profile.companyId === requiredCompanyId) {
      return true;
    }
    
    // Regular users can only access their own company's data
    const hasCompanyAccess = profile.companyId === requiredCompanyId;
    console.log(`[RBAC] User ${user.id} ${hasCompanyAccess ? 'granted' : 'denied'} access to company ${requiredCompanyId}`);
    
    return hasCompanyAccess;
  } catch (error) {
    console.error("[RBAC] Error checking company access:", error);
    return false;
  }
}

/**
 * Check if a user has access to a specific company's resources
 * 
 * @param userId The user's ID
 * @param companyId The company ID to check access for
 * @returns boolean indicating if the user has access
 */
export async function hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
  if (!userId || !companyId) return false;
  
  try {
    // First, check if user is a SUPERADMIN
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true, companyId: true }
    });
    
    if (!profile) return false;
    
    // SUPERADMINs can access any company
    if (profile.role === UserRole.SUPERADMIN) {
      return true;
    }
    
    // All other users can only access their assigned company
    return profile.companyId === companyId;
  } catch (error) {
    console.error("[RBAC] Error checking company access:", error);
    return false;
  }
}

/**
 * Get the effective company ID for a given user
 * This allows SUPERADMINs to select their company context, 
 * while other users are limited to their assigned company.
 * 
 * @param userId User ID
 * @param requestedCompanyId Company ID requested in the API call
 * @returns The effective company ID to use
 */
export async function getEffectiveCompanyId(
  userId: string, 
  requestedCompanyId?: string | null
): Promise<string | null> {
  if (!userId) return null;
  
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true, companyId: true }
    });
    
    if (!profile) return null;
    
    // For SUPERADMINs, use the requested company ID if provided
    if (profile.role === UserRole.SUPERADMIN) {
      // If a specific company is requested, use that
      if (requestedCompanyId) {
        return requestedCompanyId;
      }
      
      // Otherwise use their default company
      return profile.companyId;
    }
    
    // For all other users, they can only access their assigned company
    return profile.companyId;
  } catch (error) {
    console.error("[RBAC] Error getting effective company ID:", error);
    return null;
  }
} 