/**
 * Enhanced RBAC utilities with better error handling and logging for production
 * This builds on the existing RBAC system but adds more resilience for deployment
 */
import { UserRole } from "@prisma/client";
import { startTimer, endTimer, logWithMetrics, logError } from "@/lib/logging";
import { hasAdminPermission, hasStaffPermission } from "@/lib/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server-utils";
import prisma from "@/lib/prisma";

// Permission check results tracking for debugging
interface PermissionCheckMetrics {
  totalChecks: number;
  successes: number;
  failures: number;
  errors: number;
  bySection: Record<string, {
    checks: number;
    allowed: number;
    denied: number;
    errors: number;
  }>;
}

// Initialize metrics tracking
const metrics: PermissionCheckMetrics = {
  totalChecks: 0,
  successes: 0,
  failures: 0,
  errors: 0,
  bySection: {}
};

/**
 * Enhanced permission check with detailed logging for debugging deployment issues
 */
export async function hasPermissionSafe(
  userId: string | null | undefined,
  section: string,
  action: string = 'view',
  context?: Record<string, any>
): Promise<boolean> {
  const startTime = startTimer();
  
  try {
    if (!userId) {
      logWithMetrics('RBAC', `Permission denied: No userId for ${section}.${action}`, 0);
      return false;
    }
    
    // First check if the user is a superadmin (they can do anything)
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true }
    });
    
    if (!profile) {
      const durationMs = endTimer(startTime);
      logWithMetrics('RBAC', `Permission denied: Profile not found for ${userId}`, durationMs);
      return false;
    }
    
    // SUPERADMIN can do anything
    if (profile.role === UserRole.SUPERADMIN) {
      const durationMs = endTimer(startTime);
      logWithMetrics('RBAC', `Permission granted: User ${userId} is SUPERADMIN`, durationMs);
      return true;
    }
    
    // For admin sections, check admin permission
    if (
      section === 'admin' ||
      section === 'users' ||
      section === 'settings' ||
      section === 'finance'
    ) {
      const isAdmin = await hasAdminPermission(profile);
      const durationMs = endTimer(startTime);
      trackPermissionCheck(userId, section, action, isAdmin, null, durationMs);
      return isAdmin;
    }
    
    // For staff sections, check staff permission
    if (
      section === 'inventory' ||
      section === 'pos' ||
      section === 'sales'
    ) {
      // For certain operations, require admin permission
      if (action === 'delete' || action === 'manage') {
        const isAdmin = await hasAdminPermission(profile);
        const durationMs = endTimer(startTime);
        trackPermissionCheck(userId, section, action, isAdmin, null, durationMs);
        return isAdmin;
      }
      
      // For view/create/edit, staff permission is sufficient
      const isStaff = await hasStaffPermission(profile);
      const durationMs = endTimer(startTime);
      trackPermissionCheck(userId, section, action, isStaff, null, durationMs);
      return isStaff;
    }
    
    // Default permissions based on role
    let allowed = false;
    
    switch (profile.role) {
      case UserRole.ADMIN:
        // Admins can access everything except superadmin sections
        allowed = section !== 'superadmin';
        break;
        
      case UserRole.SELLER:
        // Sellers can access customer-facing sections
        allowed = ['dashboard', 'profile', 'pos', 'inventory', 'customer'].includes(section);
        
        // But they might have restricted actions
        if (section === 'inventory' && action !== 'view') {
          allowed = false;
        }
        break;
        
      case UserRole.USER:
        // Basic users have minimal permissions
        allowed = (section === 'dashboard' || section === 'profile') && 
                 (action === 'view' || section === 'profile');
        break;
        
      default:
        allowed = false;
    }
    
    const durationMs = endTimer(startTime);
    trackPermissionCheck(userId, section, action, allowed, null, durationMs);
    return allowed;
    
  } catch (error) {
    // Log the error but don't crash
    const durationMs = endTimer(startTime);
    logError(
      'RBAC', 
      `Error checking permission for ${userId} on ${section}.${action}`, 
      error,
      context
    );
    
    // Track metrics
    trackPermissionCheck(userId, section, action, false, error, durationMs);
    
    // In production, fail safely (deny access) rather than crashing
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    
    // In development, re-throw for proper debugging
    throw error;
  }
}

/**
 * Track permission check metrics
 */
function trackPermissionCheck(
  userId: string | null | undefined,
  section: string,
  action: string,
  result: boolean,
  error: any = null,
  durationMs: number
): void {
  // Update metrics
  metrics.totalChecks++;
  if (error) {
    metrics.errors++;
  } else if (result) {
    metrics.successes++;
  } else {
    metrics.failures++;
  }
  
  // Update section-specific metrics
  if (!metrics.bySection[section]) {
    metrics.bySection[section] = { checks: 0, allowed: 0, denied: 0, errors: 0 };
  }
  metrics.bySection[section].checks++;
  if (error) {
    metrics.bySection[section].errors++;
  } else if (result) {
    metrics.bySection[section].allowed++;
  } else {
    metrics.bySection[section].denied++;
  }
  
  // Periodically log aggregate metrics in development or when debugging
  if ((process.env.NODE_ENV === 'development' || process.env.DEBUG_RBAC === 'true') && 
       metrics.totalChecks % 10 === 0) {
    logWithMetrics(
      'RBAC', 
      `Metrics: Total=${metrics.totalChecks}, Success=${metrics.successes}, Denied=${metrics.failures}, Errors=${metrics.errors}`,
      undefined
    );
  }
}

/**
 * Enhanced client-side permission check with better error handling for UI
 */
export function hasPermissionClientSafe(
  profile: any | null,
  section: string,
  action: string = 'view'
): boolean {
  if (!profile) {
    // No need to log this common case
    return false;
  }
  
  try {
    // SUPERADMIN can do anything
    if (profile.role === UserRole.SUPERADMIN) {
      return true;
    }

    // Check json permissions if available
    if (profile.permissions?.sections) {
      return profile.permissions.sections[section]?.[action] === true;
    }

    // Basic role-based checks for UI - keep this in sync with server permissions
    switch (profile.role) {
      case UserRole.ADMIN:
        return section !== 'superadmin';
      
      case UserRole.SELLER: // Using SELLER instead of SALES to match prisma
        if (
          section === 'pos' ||
          section === 'inventory' ||
          section === 'customer' ||
          section === 'sales' ||
          section === 'dashboard'
        ) {
          if (section === 'inventory' && action !== 'view') {
            return false;
          }
          return true;
        }
        return false;
      
      case UserRole.USER:
        if (section === 'dashboard' || section === 'profile') {
          return action === 'view' || section === 'profile';
        }
        return false;
      
      default:
        return false;
    }
  } catch (error) {
    // Log error but fail securely
    logError('RBAC', 'Client permission check error', error, { 
      section, 
      action, 
      roleType: profile?.role 
    });
    return false;
  }
}

/**
 * Get RBAC metrics (for debugging)
 */
export function getRbacMetrics(): PermissionCheckMetrics {
  return { ...metrics };
}

/**
 * Safe version of isAdmin check with error handling
 */
export function isAdminSafe(profile: any | null): boolean {
  try {
    if (!profile) return false;
    return [UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(profile.role?.toString() || "");
  } catch (error) {
    logError('RBAC', 'Error checking admin status', error);
    return false;
  }
} 