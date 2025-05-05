/**
 * RBAC Utilities
 * 
 * Core server-side utilities for Role-Based Access Control (RBAC)
 * These functions handle permission checking, role verification,
 * and other RBAC-related operations.
 * 
 * NOTE: This file contains two implementations:
 * 1. Current implementation using the UserRole enum
 * 2. Commented out future implementation using the Role model
 * 
 * Once the database migration is complete, uncomment the future implementation
 * and remove the current implementation.
 */
import prisma from "@/lib/prisma";
import { User, Session } from "@supabase/supabase-js";
import { UserRole } from "@prisma/client";
import { startTimer, endTimer, logWithMetrics, logError } from "@/lib/logging";

// Type definitions for permissions structure
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

interface SectionPermission {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

interface Permissions {
  sections: {
    [sectionKey: string]: SectionPermission;
  };
}

// Hardcoded permissions for built-in roles
// This is a temporary solution until the Role model is fully implemented
const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  SUPERADMIN: {
    sections: {
      dashboard: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      tables: { view: true, create: true, edit: true, delete: true },
      finance: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      admin: { view: true, create: true, edit: true, delete: true },
      "admin.users": { view: true, create: true, edit: true, delete: true },
      "admin.roles": { view: true, create: true, edit: true, delete: true },
      "admin.companies": { view: true, create: true, edit: true, delete: true }
    }
  },
  ADMIN: {
    sections: {
      dashboard: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      tables: { view: true, create: true, edit: true, delete: true },
      finance: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      admin: { view: true },
      "admin.users": { view: true, create: true, edit: true, delete: true }
    }
  },
  SELLER: {
    sections: {
      dashboard: { view: true },
      inventory: { view: true },
      tables: { view: true, create: true, edit: true },
      finance: { view: true, create: true },
      reports: { view: true }
    }
  },
  USER: {
    sections: {
      dashboard: { view: true },
      tables: { view: true }
    }
  }
};

// Determine if we're in Vercel environment
const isVercel = process.env.VERCEL === '1';

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

// Define permission structure types
interface SectionPermissions {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  [key: string]: boolean | undefined;
}

interface RolePermissions {
  sections: {
    [key: string]: SectionPermissions;
  };
}

interface ProfileWithRole {
  userId: string;
  role: UserRole;
  roleData?: {
    permissions: RolePermissions;
  } | null;
}

/**
 * Enhanced logging for permission checks
 */
function logPermissionCheck(
  userId: string | null | undefined,
  section: string,
  action: string,
  result: boolean | null,
  error: any = null,
  durationMs?: number,
  context?: Record<string, any>
) {
  const status = error ? 'ERROR' : result ? 'ALLOWED' : 'DENIED';
  const message = `User ${userId || 'unknown'} ${status} for ${action} on ${section}`;
  
  // Use centralized logging
  if (error) {
    logError('RBAC', message, error, context);
  } else {
    logWithMetrics('RBAC', message, durationMs, context);
  }
  
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
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_RBAC === 'true') {
    if (metrics.totalChecks % 10 === 0) {
      console.log(`[RBAC Metrics] Total: ${metrics.totalChecks}, Success: ${metrics.successes}, Denied: ${metrics.failures}, Errors: ${metrics.errors}`);
    }
  }
}

/**
 * Get the current time in microseconds for performance measurement
 * Using Date.now() for compatibility with all environments including Vercel
 */
function getTime() {
  return Date.now();
}

/**
 * Calculate the elapsed time in milliseconds
 */
function getElapsedTime(start: number) {
  return Date.now() - start;
}

/**
 * Get a user's role with its associated permissions
 * Current implementation using UserRole enum
 * 
 * @param userId Supabase user ID
 * @returns UserRole and permissions
 */
export async function getUserRole(userId: string): Promise<{ role: UserRole | null; permissions: Permissions | null }> {
  if (!userId) return { role: null, permissions: null };
  
  try {
    // Get the user's profile with its role
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true }
    });
    
    if (!profile) {
      console.warn(`[RBAC] User ${userId} has no profile`);
      return { role: null, permissions: null };
    }
    
    const userRole = profile.role;
    const permissions = ROLE_PERMISSIONS[userRole];
    
    return { role: userRole, permissions };
  } catch (error) {
    console.error('[RBAC] Error fetching user role:', error);
    return { role: null, permissions: null };
  }
}

/**
 * Check if a role is the SUPERADMIN role
 * 
 * @param role UserRole to check
 * @returns boolean indicating if the role is SUPERADMIN
 */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === UserRole.SUPERADMIN;
}

/**
 * Check if a user has permission for a specific action on a section
 * 
 * @param permissions User's permissions
 * @param role User's role
 * @param sectionKey Dashboard section key
 * @param action Permission action (view, create, edit, delete)
 * @returns boolean indicating if permission is granted
 */
export function hasPermission(
  permissions: Permissions | null | undefined,
  role: UserRole | null | undefined,
  sectionKey: string,
  action: PermissionAction
): boolean {
  // SUPERADMIN bypass - always grant access
  if (isSuperAdmin(role)) {
    return true;
  }
  
  // If no permissions or invalid structure, deny access
  if (!permissions || !permissions.sections) {
    return false;
  }
  
  // Check if section exists in permissions
  const sectionPermissions = permissions.sections[sectionKey];
  if (!sectionPermissions) {
    return false;
  }
  
  // Check if action is allowed
  return !!sectionPermissions[action];
}

/**
 * Get the effective company ID for a user
 * For regular users, this is their assigned company
 * For SUPERADMIN users, this can be their selected company or null
 * 
 * @param userId User ID
 * @param requestedCompanyId Optional company ID requested
 * @returns Effective company ID or null
 */
export async function getEffectiveCompanyId(
  userId: string,
  requestedCompanyId?: string | null
): Promise<string | null> {
  if (!userId) return null;
  
  try {
    // Get the user's profile with role
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { companyId: true, role: true }
    });
    
    if (!profile) return null;
    
    // For SUPERADMIN, allow access to any company if requested
    const isSuperAdminUser = profile.role === UserRole.SUPERADMIN;
    
    if (isSuperAdminUser && requestedCompanyId) {
      // Verify the requested company exists
      const companyExists = await prisma.company.findUnique({
        where: { id: requestedCompanyId }
      });
      
      if (companyExists) {
        return requestedCompanyId;
      }
    }
    
    // For all other users, return their assigned company
    return profile.companyId;
  } catch (error) {
    console.error('[RBAC] Error determining effective company ID:', error);
    return null;
  }
}

/**
 * Check if a user can access a specific company's data
 * 
 * @param userId User ID
 * @param companyId Company ID to check access for
 * @returns boolean indicating if access is allowed
 */
export async function hasCompanyAccess(
  userId: string,
  companyId: string | null
): Promise<boolean> {
  if (!userId || !companyId) return false;
  
  try {
    // Get effective company ID (handles SUPERADMIN case)
    const effectiveCompanyId = await getEffectiveCompanyId(userId, companyId);
    
    // If effective company ID matches requested company ID, grant access
    return effectiveCompanyId === companyId;
  } catch (error) {
    console.error('[RBAC] Error checking company access:', error);
    return false;
  }
}

/**
 * Check if a user has permission to access an API endpoint
 * 
 * @param user User object from Supabase Auth
 * @param requiredCompanyId Optional company ID to check against
 * @param requiredSection Optional section key required for access
 * @param requiredAction Optional action required within section
 * @returns boolean indicating if permission is granted
 */
export async function hasApiPermission(
  user: User | Session["user"] | null | undefined,
  requiredCompanyId?: string | null,
  requiredSection?: string,
  requiredAction?: PermissionAction
): Promise<boolean> {
  if (!user) return false;
  
  const userId = user.id;
  
  try {
    // Get user role with permissions
    const { role, permissions } = await getUserRole(userId);
    
    // If SUPERADMIN, bypass all checks
    if (isSuperAdmin(role)) {
      return true;
    }
    
    // If company check is required
    if (requiredCompanyId) {
      const hasAccess = await hasCompanyAccess(userId, requiredCompanyId);
      if (!hasAccess) return false;
    }
    
    // If section and action check is required
    if (requiredSection && requiredAction) {
      return hasPermission(
        permissions,
        role,
        requiredSection,
        requiredAction
      );
    }
    
    // If we've passed all applicable checks, allow access
    return true;
  } catch (error) {
    console.error('[RBAC] Error checking API permission:', error);
    return false;
  }
}

/**
 * Check if a user has permission to perform a specific action on a section
 * Enhanced with detailed logging, timing metrics, and fallbacks
 */
export async function hasPermissionAsync(
  userId: string | null | undefined,
  section: string,
  action: string = 'view',
  context?: Record<string, any>
): Promise<boolean> {
  const startTime = startTimer();
  
  try {
    // Fail fast if no userId
    if (!userId) {
      const duration = endTimer(startTime);
      logPermissionCheck(userId, section, action, false, null, duration, { reason: 'No userId provided' });
      return false;
    }

    // First, check if the user is a SUPERADMIN (they can do anything)
    let profile;
    try {
      profile = await prisma.profile.findUnique({
        where: { userId },
        select: { 
          role: true,
          // Include role relationship if we add it in the future
          role_relation: {
            select: {
              permissions: true
            }
          }
        }
      });
    } catch (dbError) {
      const duration = endTimer(startTime);
      logPermissionCheck(
        userId, 
        section, 
        action, 
        null, 
        dbError, 
        duration, 
        { error: 'Database query failed for profile lookup' }
      );
      
      // In production, fail safely (deny) rather than throw an error
      // This prevents the entire page from failing to render
      if (process.env.NODE_ENV === 'production') {
        return false;
      } else {
        throw dbError;
      }
    }

    if (!profile) {
      const duration = endTimer(startTime);
      logPermissionCheck(userId, section, action, false, null, duration, { reason: 'Profile not found' });
      return false;
    }

    // SUPERADMIN can do anything
    if (profile.role === UserRole.SUPERADMIN) {
      const duration = endTimer(startTime);
      logPermissionCheck(userId, section, action, true, null, duration, { reason: 'User is SUPERADMIN' });
      return true;
    }

    // If using the role-based system with permissions JSON
    if (profile.role_relation?.permissions) {
      try {
        // Check permissions in the JSON structure
        const permissions = profile.role_relation.permissions as RolePermissions;
        const hasAccess = permissions?.sections?.[section]?.[action] === true;
        
        const duration = endTimer(startTime);
        logPermissionCheck(
          userId, 
          section, 
          action, 
          hasAccess, 
          null, 
          duration, 
          { permissionPath: `sections.${section}.${action}` }
        );
        
        return hasAccess;
      } catch (permissionError) {
        const duration = endTimer(startTime);
        logPermissionCheck(
          userId, 
          section, 
          action, 
          null, 
          permissionError, 
          duration, 
          { error: 'Error checking role permissions' }
        );
        
        // In production, fail safely rather than throw an error
        if (process.env.NODE_ENV === 'production') {
          return false;
        } else {
          throw permissionError;
        }
      }
    }

    // Fall back to basic role-based permissions if no roleId or permission structure
    const allowed = await hasPermissionByRole(profile.role, section, action);
    const duration = endTimer(startTime);
    logPermissionCheck(
      userId, 
      section, 
      action, 
      allowed, 
      null, 
      duration, 
      { fallback: 'Using role-based fallback permissions', role: profile.role }
    );
    
    return allowed;
  } catch (error) {
    const duration = endTimer(startTime);
    logPermissionCheck(
      userId, 
      section, 
      action, 
      null, 
      error, 
      duration, 
      { critical: 'Unhandled error in permission check' }
    );
    
    // In production, fail safely rather than throw an error
    if (process.env.NODE_ENV === 'production') {
      return false;
    } else {
      throw error;
    }
  }
}

/**
 * Check permissions based on role for backward compatibility
 */
async function hasPermissionByRole(
  role: UserRole,
  section: string,
  action: string = 'view'
): Promise<boolean> {
  // SUPERADMIN can do anything (should be caught earlier, but just in case)
  if (role === UserRole.SUPERADMIN) {
    return true;
  }

  // Define basic permissions by role
  switch (role) {
    case UserRole.ADMIN:
      // Admins can do everything except specific superadmin actions
      if (section === 'superadmin') {
        return false;
      }
      return true;

    case UserRole.SALES:
      // Sales can view/interact with sales-related sections
      if (
        section === 'pos' ||
        section === 'inventory' ||
        section === 'customer' ||
        section === 'sales' ||
        section === 'dashboard'
      ) {
        // For inventory, they can view but not edit
        if (section === 'inventory' && action !== 'view') {
          return false;
        }
        return true;
      }
      return false;

    case UserRole.USER:
      // Basic users have minimal access
      if (
        section === 'dashboard' ||
        section === 'profile'
      ) {
        // Basic users can only view most sections
        if (action !== 'view' && section !== 'profile') {
          return false;
        }
        return true;
      }
      return false;

    default:
      // Default to deny for unknown roles
      return false;
  }
}

/**
 * Client-side version of permission check for UI
 * This should only be used for UI display decisions, not for security enforcement
 */
export function hasPermissionClient(
  profile: any | null,
  section: string,
  action: string = 'view'
): boolean {
  // Log on client for debugging when needed
  const doLogging = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_RBAC === 'true';
  
  try {
    if (!profile) {
      if (doLogging) console.log(`[Client RBAC] Permission denied: No profile`);
      return false;
    }

    // SUPERADMIN can do anything
    if (profile.role === UserRole.SUPERADMIN) {
      if (doLogging) console.log(`[Client RBAC] Permission granted: User is SUPERADMIN`);
      return true;
    }

    // Check json permissions if available
    if (profile.permissions) {
      const hasAccess = profile.permissions?.sections?.[section]?.[action] === true;
      if (doLogging) {
        console.log(`[Client RBAC] Permission ${hasAccess ? 'granted' : 'denied'} for ${profile.role || 'unknown'} on ${section}.${action}`);
      }
      return hasAccess;
    }

    // Fall back to basic role check
    if (doLogging) {
      console.log(`[Client RBAC] Using fallback permissions for ${profile.role || 'unknown'} on ${section}.${action}`);
    }
    
    // Very basic client-side fallback permissions
    // Note: This is just for UI and should match the server-side logic in hasPermissionByRole
    
    if (profile.role === UserRole.ADMIN) {
      return section !== 'superadmin';
    }
    
    if (profile.role === UserRole.SALES) {
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
    }
    
    if (profile.role === UserRole.USER) {
      if (
        section === 'dashboard' ||
        section === 'profile'
      ) {
        return action === 'view' || section === 'profile';
      }
      return false;
    }
    
    // Default to deny
    return false;
  } catch (error) {
    // Log error but fail securely by denying access
    console.error('[Client RBAC] Error checking permissions:', error);
    return false;
  }
}

/**
 * Utility to check if user is an admin (ADMIN or SUPERADMIN)
 * Enhanced with error handling
 */
export function isAdmin(profile: any | null): boolean {
  try {
    if (!profile) return false;
    return [UserRole.ADMIN.toString(), UserRole.SUPERADMIN.toString()].includes(profile.role?.toString() || "");
  } catch (error) {
    console.error('[RBAC] Error checking admin status:', error);
    return false;
  }
}

/**
 * Get RBAC metrics (for debugging)
 */
export function getRbacMetrics(): PermissionCheckMetrics {
  return { ...metrics };
} 