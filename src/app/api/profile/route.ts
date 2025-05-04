import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import type { Prisma, Profile } from "@prisma/client";
import { createAPIRouteClient } from "@/lib/auth-server-utils";

// Common function to create a JSON response with proper headers
function createJsonResponse(data: any, status: number = 200) {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  
  return new NextResponse(
    JSON.stringify(data),
    { 
      status,
      headers
    }
  );
}

// Common error handler function to standardize auth error responses
function handleAuthError(error: any, message: string = "Authentication failed") {
  console.error(`[API:profile] Auth error: ${error?.message || 'Unknown error'}`);
  return createJsonResponse({ 
    error: "Not authenticated", 
    detail: error?.message || message
  }, 401);
}

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check if there's a userId query parameter (for compatibility with by-id endpoint)
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    // Initialize Supabase client using our enhanced API Route client
    const supabase = createAPIRouteClient(request);
    
    // Get authenticated user - this is common for both paths
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return handleAuthError(authError, 'Auth session missing!');
    }

    console.log(`[API:profile] Authenticated user: ${user.id}`);
    
    if (userIdParam) {
      // Check if the user is requesting their own profile or has admin permission
      if (userIdParam !== user.id) {
        // Fetch requester's profile to check role
        const requesterProfile = await prisma.profile.findUnique({
          where: { userId: user.id },
          select: { role: true }
        });
        
        const isSuperAdmin = requesterProfile?.role === UserRole.SUPERADMIN;
        const isAdmin = requesterProfile?.role === UserRole.ADMIN;
        
        if (!isSuperAdmin && !isAdmin) {
          return createJsonResponse({ 
            error: "Forbidden", 
            detail: "Insufficient permissions to view this profile" 
          }, 403);
        }
      }
      
      // Fetch the profile for the requested userId
      const profile = await prisma.profile.findUnique({
        where: { userId: userIdParam }
      });
      
      if (!profile) {
        return createJsonResponse({ error: "Profile not found" }, 404);
      }
      
      return createJsonResponse({ profile });
    }
    
    // Get the user's profile from the database
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id }
    });
    
    if (!profile) {
      console.log(`[API:profile] Profile not found for user ${user.id}, checking if we should create one`);
      
      // Check if we have user metadata to create a profile with
      const userMetadata = user.user_metadata || {};
      const email = user.email || '';
      
      // For new users, create a default profile
      try {
        // Extract name from email if needed 
        const emailName = email.split('@')[0];
        const emailNameParts = emailName ? emailName.split('.') : [];
        
        // Get name information with fallbacks
        const firstName = 
          userMetadata.firstName || 
          userMetadata.first_name || 
          userMetadata.given_name ||
          (emailNameParts.length > 0 ? 
            emailNameParts[0].charAt(0).toUpperCase() + emailNameParts[0].slice(1) : 
            "User");
        
        const lastName = 
          userMetadata.lastName || 
          userMetadata.last_name || 
          userMetadata.family_name || 
          (emailNameParts.length > 1 ? 
            emailNameParts[1].charAt(0).toUpperCase() + emailNameParts[1].slice(1) : 
            "");
        
        // Check for role in metadata
        const role = (() => {
          // Check for role in metadata - with fallbacks
          const metadataRole = 
            userMetadata.role || 
            userMetadata.userRole || 
            userMetadata.user_role;
          
          // Check if superadmin is specified
          if (metadataRole === 'SUPERADMIN' || 
              userMetadata.isSuperAdmin === true || 
              userMetadata.is_superadmin === true) {
            return UserRole.SUPERADMIN;
          }
          
          // Default to USER role
          return UserRole.USER;
        })();
        
        console.log(`[API:profile] Creating new profile for user ${user.id} with role ${role}`);
        
        const newProfile = await prisma.profile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
            role,
            active: true,
            companyId: null
          },
        });
        
        console.log(`[API:profile] New profile created successfully`);
        
        // Use our helper to return a consistent JSON response
        return createJsonResponse({ 
          profile: newProfile,
          created: true
        });
      } catch (createError) {
        console.error(`[API:profile] Failed to create profile:`, createError);
        return createJsonResponse({
          error: "Failed to create profile", 
          detail: createError instanceof Error ? createError.message : String(createError)
        }, 500);
      }
    }
    
    // Profile found, return it
    console.log(`[API:profile] Profile found for user ${user.id}`);
    return createJsonResponse({ profile });
    
  } catch (error) {
    console.error(`[API:profile] Unexpected error:`, error);
    return createJsonResponse({
      error: "Server error", 
      detail: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    // Get the profile data from the request body
    const data = await request.json();
    const { firstName, lastName, avatarUrl, active } = data;
    
    // Initialize Supabase client using our enhanced API Route client
    const supabase = createAPIRouteClient(request);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return handleAuthError(authError, 'Auth session missing!');
    }
    
    const userId = user.id;

    // Update the profile directly
    try {
      // Find the existing profile first
      const existingProfile = await prisma.profile.findUnique({
        where: { userId }
      });

      if (!existingProfile) {
        // Create a new profile if it doesn't exist
        const newProfile = await prisma.profile.create({
          data: {
            userId,
            firstName: firstName || null,
            lastName: lastName || null,
            avatarUrl: avatarUrl || null,
            active: active ?? true,
            role: UserRole.USER  // Default role
          }
        });
        
        return createJsonResponse({ profile: newProfile }, 201);
      }
      
      // Update the existing profile
      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          firstName: firstName !== undefined ? firstName : existingProfile.firstName,
          lastName: lastName !== undefined ? lastName : existingProfile.lastName,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : existingProfile.avatarUrl,
          active: active !== undefined ? active : existingProfile.active
        }
      });
      
      return createJsonResponse({ profile: updatedProfile });
    } catch (error) {
      console.error("[API:profile] Error updating profile:", error);
      return createJsonResponse({ 
        error: "Failed to update profile",
        detail: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  } catch (error) {
    console.error("[API:profile] Error in profile PUT endpoint:", error);
    return createJsonResponse({ 
      error: "Failed to process update request",
      detail: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

// POST: Create a new profile for the current authenticated user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, firstName, lastName, avatarUrl, role } = data;

    if (!userId) {
      return createJsonResponse({ error: "User ID is required" }, 400);
    }

    // Initialize Supabase client and verify authentication for security
    const supabase = createAPIRouteClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return handleAuthError(authError, 'Auth session missing!');
    }
    
    // Check if user has admin privileges to create profiles for others
    if (userId !== user.id) {
      const requesterProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { role: true }
      });
      
      const isSuperAdmin = requesterProfile?.role === UserRole.SUPERADMIN;
      const isAdmin = requesterProfile?.role === UserRole.ADMIN;
      
      if (!isSuperAdmin && !isAdmin) {
        return createJsonResponse({ 
          error: "Forbidden", 
          detail: "Insufficient permissions to create profiles for other users" 
        }, 403);
      }
    }

    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return createJsonResponse({ error: "Profile already exists" }, 409);
      }

      // Create the profile directly
      const newProfile = await prisma.profile.create({
        data: {
          userId,
          firstName: firstName || null,
          lastName: lastName || null,
          avatarUrl: avatarUrl || null,
          role: (role as UserRole) || UserRole.USER,
          active: true
        }
      });

      return createJsonResponse({ profile: newProfile }, 201);
    } catch (error) {
      console.error("[API:profile] Database error creating profile:", error);
      return createJsonResponse({ 
        error: "Database error creating profile", 
        detail: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  } catch (error) {
    console.error("[API:profile] Error in profile creation endpoint:", error);
    return createJsonResponse({ 
      error: "Failed to create profile", 
      detail: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

export async function GETAll(req: Request) {
  try {
    // Initialize Supabase client and verify authentication
    const request = req as unknown as NextRequest;
    const supabase = createAPIRouteClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return handleAuthError(authError, 'Auth session missing!');
    }
    
    // Check if user has admin privileges to list all profiles
    const requesterProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { role: true }
    });
    
    const isSuperAdmin = requesterProfile?.role === UserRole.SUPERADMIN;
    const isAdmin = requesterProfile?.role === UserRole.ADMIN;
    
    if (!isSuperAdmin && !isAdmin) {
      return createJsonResponse({ 
        error: "Forbidden", 
        detail: "Insufficient permissions to list all profiles" 
      }, 403);
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const active = searchParams.get("active");

    const whereClause: Prisma.ProfileWhereInput = {};

    if (role) whereClause.role = role as UserRole;
    if (active !== null) whereClause.active = active === "true";

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Use our helper to return a consistent JSON response
    return createJsonResponse({ profiles });
  } catch (error) {
    console.error("[API:profile] Error fetching profiles:", error);
    return createJsonResponse({ 
      error: "Internal server error",
      detail: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}
