// Authentication implementation with proper role management
// This handles superadmin, admin, and user roles with company associations

// Mark as server-only to prevent importing in client components
// This will cause a build error if imported from client components
import 'server-only';
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from "next/headers";
import { initializeUserMetadata, updateUserCompany, updateUserRole, getAuthMetadataFromSession } from './auth-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

// Define the JoinRequestStatus enum since it might not be exported yet
export enum JoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  companyId?: string;
}

export interface Session {
  user: User;
  expires: Date;
}

export interface JoinRequest {
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
export interface ProfileType {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  companyId: string | null;
  avatarUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
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
 * Centralized function to create or update a user profile
 * This ensures consistent role assignment and profile creation
 */
export async function createOrUpdateUserProfile(
  userId: string,
  metadata: any = {},
  options: {
    forcedRole?: UserRole;
    companyId?: string;
    active?: boolean;
  } = {}
): Promise<ProfileType> {
  try {
    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });
    
    if (existingProfile) {
      // If profile exists, update if necessary
      const updateData: any = {};
      
      if (options.companyId) updateData.companyId = options.companyId;
      if (options.forcedRole) updateData.role = options.forcedRole;
      if (options.active !== undefined) updateData.active = options.active;
      
      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedProfile = await prisma.profile.update({
          where: { userId },
          data: updateData
        });

        // Also update the user's app_metadata to keep in sync
        if (options.forcedRole) {
          await updateUserRole(userId, options.forcedRole);
        }
        
        if (options.companyId !== undefined) {
          await updateUserCompany(userId, options.companyId);
        }
        
        return updatedProfile;
      }
      
      return existingProfile;
    }
    
    // Extract user information from metadata
    // Handle various metadata formats consistently
    const emailName = metadata.email ? metadata.email.split('@')[0] : null;
    const emailNameParts = emailName ? emailName.split('.') : [];
    
    const firstName = 
      metadata.firstName || 
      metadata.first_name || 
      metadata.given_name ||
      metadata.name?.split(' ')[0] || 
      (emailNameParts.length > 0 ? 
        emailNameParts[0].charAt(0).toUpperCase() + emailNameParts[0].slice(1) : 
        "User");
    
    const lastName = 
      metadata.lastName || 
      metadata.last_name || 
      metadata.family_name || 
      metadata.name?.split(' ').slice(1).join(' ') || 
      (emailNameParts.length > 1 ? 
        emailNameParts[1].charAt(0).toUpperCase() + emailNameParts[1].slice(1) : 
        "");
    
    // Determine role - check various possible indicators
    const isSuperAdmin = 
      metadata.role === UserRole.SUPERADMIN || 
      metadata.isSuperAdmin === true ||
      (typeof metadata.is_superadmin === 'boolean' && metadata.is_superadmin);
    
    // Use forcedRole if provided, otherwise determine from metadata
    const role = options.forcedRole || (isSuperAdmin ? UserRole.SUPERADMIN : UserRole.USER);
    
    // Create the profile
    const newProfile = await prisma.profile.create({
      data: {
        userId,
        firstName,
        lastName,
        avatarUrl: metadata.avatarUrl || metadata.avatar_url || null,
        role,
        companyId: options.companyId || null,
        active: options.active ?? true,
      }
    });

    // Initialize the user's app_metadata with role and companyId
    await initializeUserMetadata(userId, role);
    
    // If a company is specified, update that in metadata too
    if (options.companyId) {
      await updateUserCompany(userId, options.companyId);
    }
    
    return newProfile;
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    throw error;
  }
}

/**
 * Authentication utilities
 */
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { initializeUserMetadata, updateUserCompany, updateUserRole, getAuthMetadataFromSession } from './auth-metadata';

// Create a reusable server-side Supabase client for route handlers
export function createApiClient(request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // If we have a request object, we can use the cookies from it
  if (request) {
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value || null;
          },
          set() {
            // API routes don't need to set cookies
          },
          remove() {
            // API routes don't need to remove cookies
          }
        }
      }
    );
  }

  // Otherwise use the global cookies() API (for RSC/Server Components)
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = cookies();
            let cookieValue: string | null = null;
            
            try {
              // Await the promise
              const allCookies = await cookieStore;
              // Get the specific cookie value
              cookieValue = allCookies.get(name)?.value || null;
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieValue = cookieStore.get?.(name)?.value || null;
            }
            
            return cookieValue;
          } catch (error) {
            console.error('[Cookie] Error reading cookie:', error);
            return null;
          }
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = cookies();
            
            try {
              // Await the promise and set the cookie
              const store = await cookieStore;
              store.set(name, value, options);
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, value, options);
            }
          } catch (error) {
            console.error('[Cookie] Error setting cookie:', error);
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = cookies();
            
            try {
              // Await the promise and remove the cookie
              const store = await cookieStore;
              store.set(name, '', { ...options, maxAge: 0 });
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, '', { ...options, maxAge: 0 });
            }
          } catch (error) {
            console.error('[Cookie] Error removing cookie:', error);
          }
        }
      }
    }
  );
}

// A service client for non-authenticated server-side operations
export const auth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Schema for validating auth token
export const authTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
});

export type AuthToken = z.infer<typeof authTokenSchema>;

/**
 * Get authentication information using a three-tier approach:
 * 1. Supabase authenticated session with app_metadata from JWT claims
 * 2. Find profile in database if JWT metadata is not available
 * 3. Fallback to a dummy user if neither is available (dev only)
 * 
 * The returned user will include role and company information.
 */
export async function auth(): Promise<Session | null> {
  try {
    // Use Supabase's recommended client for server components
    const supabase = createRouteHandlerClient({ cookies });
    
    // Try to get Supabase auth user - using getUser instead of getSession as recommended by Supabase
    let userId = null;
    let userEmail = null;
    let userData = null;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Supabase auth error:", error.message);
      } else if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email;
        userData = data.user.user_metadata;
      }
    } catch (supabaseError) {
      console.error("Error getting Supabase user:", supabaseError);
    }
    
    // If we have a userId, try to get metadata from JWT claims first
    if (userId) {
      // First attempt to get role and companyId from JWT claims (app_metadata)
      const authMetadata = await getAuthMetadataFromSession();
      
      if (authMetadata?.initialized) {
        console.log("Using app_metadata from JWT claims for user", userId);
        
        // Find profile to get name data, but we'll use the role/companyId from JWT
        const userProfile = await prisma.profile.findUnique({
          where: { userId },
          select: { 
            id: true,
            userId: true,
            firstName: true, 
            lastName: true
          }
        });
        
        // User authenticated with valid JWT claims
        return {
          user: {
            id: userId,
            email: userEmail || undefined,
            name: userProfile?.firstName ? 
              `${userProfile.firstName} ${userProfile.lastName || ''}` : 
              userData?.name || undefined,
            role: authMetadata.role,
            companyId: authMetadata.companyId || undefined
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };
      }
      
      // Fallback to database profile if JWT claims are not initialized
      // Find existing profile
      const userProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { 
          id: true,
          userId: true,
          firstName: true, 
          lastName: true, 
          role: true,
          companyId: true
        }
      });
      
      // If no profile exists, create one
      if (!userProfile) {
        console.log("Creating profile for authenticated user", userId);
        const newProfile = await createOrUpdateUserProfile(userId, {
          ...userData,
          email: userEmail
        });
        
        // Return session with newly created profile data
        return {
          user: {
            id: userId,
            email: userEmail || undefined,
            name: newProfile.firstName ? 
              `${newProfile.firstName} ${newProfile.lastName || ''}` : 
              userData?.name || undefined,
            role: newProfile.role || UserRole.USER,
            companyId: newProfile.companyId || undefined
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        };
      }
      
      // Return session with existing profile data from database
      return {
        user: {
          id: userId,
          email: userEmail || undefined,
          name: userProfile.firstName ? 
            `${userProfile.firstName} ${userProfile.lastName || ''}` : 
            userData?.name || undefined,
          role: userProfile.role || UserRole.USER,
          companyId: userProfile.companyId || undefined
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    }
    
    // If no auth found, try finding a superadmin in the database as fallback for development only
    if (process.env.NODE_ENV === 'development') {
      console.warn("Using superadmin fallback for development environment");
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
    }
    
    // No valid session found
    return null;
  } catch (error) {
    console.error("Error in auth function:", error);
    return null;
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
