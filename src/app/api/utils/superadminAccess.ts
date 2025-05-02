import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

/**
 * Utility functions to handle superadmin access across the application
 */

/**
 * Checks if a user is a superadmin
 * @param userId The user ID to check
 * @returns Boolean indicating if the user is a superadmin
 */
export const isSuperAdmin = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { role: true }
    });
    
    return profile?.role === UserRole.SUPERADMIN;
  } catch (error) {
    console.error("Error checking if user is superadmin:", error);
    return false;
  }
}

/**
 * Gets a company ID parameter or returns the superadmin parameter if user is superadmin
 * This is the core function that enables superadmins to access resources across companies
 * 
 * @param userId The user ID from the session
 * @param companyIdParam The company ID from the request (query params or body)
 * @returns The appropriate company ID to use for the query
 */
export const getEffectiveCompanyId = async (userId: string, companyIdParam: string | null): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    // Check if user is superadmin
    const isSuperAdminUser = await isSuperAdmin(userId);
    
    if (isSuperAdminUser) {
      // Superadmins can specify which company they want to access via the companyIdParam
      // If not specified, get their default company ID
      if (companyIdParam) {
        return companyIdParam;
      }
      
      // If no company ID specified, get the user's profile to get their default company
      const profile = await db.profile.findUnique({
        where: { userId },
        select: { companyId: true, company_id: true }
      });
      
      // Check both possible column names (handling SQL schema inconsistency)
      return (profile?.companyId || (profile as any)?.company_id) || null;
    } else {
      // Regular users can only access their own company
      const profile = await db.profile.findUnique({
        where: { userId },
        select: { companyId: true, company_id: true }
      });
      
      // Check both possible column names (handling SQL schema inconsistency)
      return (profile?.companyId || (profile as any)?.company_id) || null;
    }
  } catch (error) {
    console.error("Error determining effective company ID:", error);
    return null;
  }
} 