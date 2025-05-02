// Authentication implementation with proper role management
// This handles superadmin, admin, and user roles with company associations

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { supabase } from "@/lib/supabase/client";

// Define the JoinRequestStatus enum since it might not be exported yet
enum JoinRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  companyId?: string;
}

interface Session {
  user: User;
  expires: Date;
}

interface JoinRequest {
  id: string;
  userId: string;
  companyId: string;
  companyName?: string;
  userName?: string;
  status: string;
  message?: string;
  createdAt: Date;
}

// Define profile type for type safety
interface ProfileType {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  role: string;
  companyId?: string;
}

// Define request type for type safety
interface JoinRequestType {
  id: string;
  profileId: string;
  companyId: string;
  status: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    userId: string;
    firstName?: string;
    lastName?: string;
  };
  company: {
    name: string;
  };
}

/**
 * Get authentication information using a three-tier approach:
 * 1. Supabase authenticated session (if available)
 * 2. Find a superadmin in the database as fallback
 * 3. Fallback to a dummy user if neither is available
 * 
 * The returned user will include role and company information.
 */
export async function auth(): Promise<Session | null> {
  try {
    // Try to get Supabase auth session
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        // We have an authenticated user, now get their profile including role and company
        const userProfile = await prisma.profile.findUnique({
          where: { userId: data.session.user.id },
          select: { 
            id: true,
            userId: true,
            firstName: true, 
            lastName: true, 
            role: true,
            companyId: true
          }
        });
        
        // Return session with combined user data
        return {
          user: {
            id: data.session.user.id,
            email: data.session.user.email || undefined,
            name: userProfile?.firstName ? 
              `${userProfile.firstName} ${userProfile.lastName || ''}` : 
              data.session.user.user_metadata?.name || undefined,
            role: userProfile?.role || data.session.user.user_metadata?.role || UserRole.USER,
            companyId: userProfile?.companyId || undefined
          },
          expires: new Date(data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 24 * 60 * 60 * 1000),
        };
      }
    } catch (supabaseError) {
      console.error("Error getting Supabase session:", supabaseError);
    }
    
    // If no auth found, try finding a superadmin in the database as fallback
    const superAdmin = await prisma.profile.findFirst({
      where: { role: UserRole.SUPERADMIN },
      select: { 
        id: true,
        userId: true, 
        firstName: true, 
        lastName: true, 
        role: true,
        companyId: true
      }
    });
    
    if (superAdmin) {
      return {
        user: {
          id: superAdmin.userId,
          name: superAdmin.firstName ? `${superAdmin.firstName} ${superAdmin.lastName || ''}` : undefined,
          role: superAdmin.role,
          companyId: superAdmin.companyId || undefined
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
    
    // Last resort - use fallback ID
    const fallbackId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "123e4567-e89b-12d3-a456-426614174000";
    
    return {
      user: {
        id: fallbackId,
        email: "user@example.com",
        name: "Demo User",
        role: UserRole.USER,
        companyId: undefined
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    console.error("Error in auth function:", error);
    // If anything fails, return fallback user
    const fallbackId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "123e4567-e89b-12d3-a456-426614174000";
    
    return {
      user: {
        id: fallbackId,
        email: "user@example.com",
        name: "Demo User",
        role: UserRole.USER,
        companyId: undefined
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * Function to get the current user (useful for client components)
 * The returned user will include role and company information
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  return session?.user || null;
}

/**
 * Check if a user has access to a specific company's data.
 * SUPERADMIN has access to all companies.
 * ADMIN and other roles only have access to their assigned company.
 */
export async function hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true, companyId: true }
    });

    if (!profile) return false;

    // SUPERADMIN has access to everything
    if (profile.role === UserRole.SUPERADMIN) return true;

    // Other roles only have access to their assigned company
    return profile.companyId === companyId;
  } catch (error) {
    console.error("Error checking company access:", error);
    return false;
  }
}

/**
 * Request to join a specific company
 * This creates a pending join request that needs approval by an admin
 */
export async function requestToJoinCompany(userId: string, companyId: string, message?: string): Promise<boolean> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, companyId: true }
    });

    if (!profile) return false;
    
    // If user already has a company, they can't request to join another one
    if (profile.companyId) return false;

    // Check if there's already a pending request
    // Since we're using raw prisma client for now, we'll use a workaround
    // for the join request model
    const existingRequests = await prisma.$queryRaw`
      SELECT * FROM company_join_requests
      WHERE profile_id = ${profile.id}::uuid
        AND company_id = ${companyId}::uuid
        AND status = 'PENDING'
    `;
    
    if (Array.isArray(existingRequests) && existingRequests.length > 0) {
      return true; // Request already exists
    }
    
    // Create a new join request
    await prisma.$executeRaw`
      INSERT INTO company_join_requests (
        id, profile_id, company_id, status, message, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${profile.id}::uuid, ${companyId}::uuid, 
        'PENDING', ${message || null}, now(), now()
      )
    `;
    
    return true;
  } catch (error) {
    console.error("Error requesting to join company:", error);
    return false;
  }
}

/**
 * Get all pending join requests for companies accessible to the current user
 * SUPERADMIN sees all requests, ADMIN sees only their company's requests
 */
export async function getPendingJoinRequests(userId: string): Promise<JoinRequest[]> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!profile) return [];

    let requests: any[] = [];
    
    if (profile.role === UserRole.SUPERADMIN) {
      // Superadmin can see all pending requests
      requests = await prisma.$queryRaw`
        SELECT 
          cjr.id, 
          p.user_id as "userId", 
          cjr.company_id as "companyId",
          c.name as "companyName",
          p.first_name as "firstName", 
          p.last_name as "lastName",
          cjr.status,
          cjr.message,
          cjr.created_at as "createdAt"
        FROM company_join_requests cjr
        JOIN profiles p ON cjr.profile_id = p.id
        JOIN companies c ON cjr.company_id = c.id
        WHERE cjr.status = 'PENDING'
        ORDER BY cjr.created_at DESC
      `;
    } else if (profile.role === UserRole.ADMIN && profile.companyId) {
      // Admin can only see requests for their company
      requests = await prisma.$queryRaw`
        SELECT 
          cjr.id, 
          p.user_id as "userId", 
          cjr.company_id as "companyId",
          c.name as "companyName",
          p.first_name as "firstName", 
          p.last_name as "lastName",
          cjr.status,
          cjr.message,
          cjr.created_at as "createdAt"
        FROM company_join_requests cjr
        JOIN profiles p ON cjr.profile_id = p.id
        JOIN companies c ON cjr.company_id = c.id
        WHERE cjr.company_id = ${profile.companyId}::uuid
          AND cjr.status = 'PENDING'
        ORDER BY cjr.created_at DESC
      `;
    }

    return requests.map(req => ({
      id: req.id,
      userId: req.userId,
      companyId: req.companyId,
      companyName: req.companyName,
      userName: req.firstName 
        ? `${req.firstName} ${req.lastName || ''}`
        : undefined,
      status: req.status,
      message: req.message || undefined,
      createdAt: req.createdAt
    }));
  } catch (error) {
    console.error("Error getting pending join requests:", error);
    return [];
  }
}

/**
 * Approve or reject a join request
 */
export async function processJoinRequest(
  requestId: string, 
  decision: 'APPROVE' | 'REJECT', 
  adminUserId: string
): Promise<boolean> {
  try {
    const adminProfile = await prisma.profile.findUnique({
      where: { userId: adminUserId },
      select: { role: true, companyId: true }
    });

    if (!adminProfile) return false;
    
    // Find the request
    const requests = await prisma.$queryRaw`
      SELECT cjr.*, p.id as profile_id
      FROM company_join_requests cjr
      JOIN profiles p ON cjr.profile_id = p.id
      WHERE cjr.id = ${requestId}::uuid
    `;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return false;
    }
    
    const request = requests[0] as any;
    
    // Check authorization
    if (adminProfile.role !== UserRole.SUPERADMIN && adminProfile.companyId !== request.company_id) {
      return false; // Admin can only process requests for their own company
    }

    // Update the request status
    const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    
    await prisma.$executeRaw`
      UPDATE company_join_requests 
      SET status = ${newStatus}, updated_at = now()
      WHERE id = ${requestId}::uuid
    `;

    // If approved, update the user's profile with the company ID
    if (decision === 'APPROVE') {
      await prisma.profile.update({
        where: { id: request.profile_id },
        data: { companyId: request.company_id }
      });
    }

    return true;
  } catch (error) {
    console.error("Error processing join request:", error);
    return false;
  }
}

/**
 * Get a list of users awaiting approval (no company assigned)
 * For SUPERADMIN: all users without a company
 * For ADMIN: users who have specifically requested to join their company
 */
export async function getAwaitingApprovalUsers(currentUserId: string): Promise<User[]> {
  try {
    const currentUserProfile = await prisma.profile.findUnique({
      where: { userId: currentUserId },
      select: { id: true, role: true, companyId: true }
    });

    if (!currentUserProfile) return [];

    // For superadmin, get all users without a company
    if (currentUserProfile.role === UserRole.SUPERADMIN) {
      const awaitingUsers = await prisma.profile.findMany({
        where: { 
          companyId: null,
          role: UserRole.USER // Only regular users need approval
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });

      return awaitingUsers.map(user => ({
        id: user.userId,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : undefined,
        role: user.role
      }));
    } 
    // For admin, get users who have requested to join their company
    else if (currentUserProfile.role === UserRole.ADMIN && currentUserProfile.companyId) {
      const requests = await prisma.$queryRaw`
        SELECT 
          p.user_id as "userId",
          p.first_name as "firstName",
          p.last_name as "lastName",
          p.role
        FROM company_join_requests cjr
        JOIN profiles p ON cjr.profile_id = p.id
        WHERE cjr.company_id = ${currentUserProfile.companyId}::uuid
          AND cjr.status = 'PENDING'
      `;

      return (requests as any[]).map(req => ({
        id: req.userId,
        name: req.firstName 
          ? `${req.firstName} ${req.lastName || ''}` 
          : undefined,
        role: req.role
      }));
    }

    return [];
  } catch (error) {
    console.error("Error getting awaiting approval users:", error);
    return [];
  }
}
