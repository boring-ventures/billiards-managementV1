import { UserRole } from "@prisma/client";
import type { Profile } from "@/types/profile";
import { cookieUtils, COMPANY_SELECTION_COOKIE, VIEW_MODE_COOKIE } from "./cookie-utils";

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
    
    // Execute the imports
    importHeaders();
    importSSR();
  } catch (error) {
    console.warn("Could not import server-only modules:", error);
  }
}

/**
 * Gets the active company ID for the current user
 * - Checks JWT claims first (for all users)
 * - For regular users, returns their assigned company ID from profile
 * - For superadmins, returns the selected company ID from cookies or null
 */
export const getActiveCompanyId = async (profile: Profile | null): Promise<string | null> => {
  if (!profile) return null;
  
  // First try to get companyId from JWT claims if we're server-side
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
      
      if (data?.session?.user?.app_metadata?.companyId) {
        return data.session.user.app_metadata.companyId;
      }
    } catch (error) {
      console.error("Error getting companyId from JWT:", error);
      // Fall back to profile or cookie
    }
  }
  
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
export const canAccessDashboard = async (profile: Profile | null): Promise<boolean> => {
  if (!profile) return false;
  
  // Get the active company ID using the updated function
  const companyId = await getActiveCompanyId(profile);
  return !!companyId;
};

/**
 * Redirects the user based on their role and company assignment
 * - Superadmins without company selection go to company-selection
 * - Regular users without company assignment go to waiting-approval
 * - Users with proper access go to dashboard
 */
export const getRedirectPath = async (profile: Profile | null): Promise<string> => {
  if (!profile) return '/sign-in';
  
  const isSuperadmin = profile.role === UserRole.SUPERADMIN;
  const companyId = await getActiveCompanyId(profile);
  
  if (isSuperadmin && !companyId) {
    return '/company-selection';
  }
  
  if (!isSuperadmin && !companyId) {
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