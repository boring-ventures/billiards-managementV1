import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import type { Prisma, Profile } from "@prisma/client";
import { auth } from "@/lib/auth";

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check if there's a userId query parameter (for compatibility with by-id endpoint)
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    if (userIdParam) {
      // Redirect to the by-id endpoint
      const byIdEndpoint = '/api/profile/by-id';
      const response = await fetch(`${new URL(request.url).origin}${byIdEndpoint}?userId=${userIdParam}`, {
        headers: {
          cookie: request.headers.get('cookie') || '',
          authorization: request.headers.get('authorization') || ''
        }
      });
      
      return response;
    }
    
    // Regular authentication flow for current user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Log cookies and auth headers for debugging
    const authHeader = request.headers.get('authorization');
    console.log('[Profile API] Auth header present:', !!authHeader);
    console.log('[Profile API] Cookie header present:', !!request.headers.get('cookie'));
    
    // Try to extract bearer token from Authorization header
    let userId = null;
    let sessionData = null;
    
    // If we have an auth header, use it to get the session
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        console.log('[Profile API] Using Authorization header token');
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          sessionData = data;
          userId = data.user.id;
          console.log('[Profile API] User found from token:', userId);
        } else {
          console.warn('[Profile API] Invalid token in Authorization header:', error?.message);
        }
      } catch (error) {
        console.error('[Profile API] Error verifying token:', error);
      }
    }
    
    // Fallback to cookies if header auth failed
    if (!sessionData) {
      try {
        console.log('[Profile API] Trying cookies for authentication');
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('[Profile API] Cookie auth error:', error.message);
          return NextResponse.json(
            { error: error?.message || "Not authenticated" },
            { status: 401 }
          );
        }
        
        if (!data?.user) {
          console.error('[Profile API] No user found in cookie auth');
          return NextResponse.json(
            { error: "User not found" },
            { status: 401 }
          );
        }
        
        sessionData = data;
        userId = data.user.id;
        console.log('[Profile API] User found from cookies:', userId);
      } catch (error) {
        console.error('[Profile API] Supabase getUser error:', error);
        return NextResponse.json(
          { error: "Authentication error" },
          { status: 401 }
        );
      }
    }
    
    // If we still don't have a userId, we can't proceed
    if (!userId) {
      console.error('[Profile API] Could not determine user ID');
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    
    // Check if we already have a profile
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Use the centralized function to create a profile
      try {
        // Extract user metadata and handle it as a generic object to avoid typing issues
        const userData = sessionData?.user || {};
        const metadata = userData.user_metadata as Record<string, any> || {};
        metadata.email = userData.email;
        
        // Check for superadmin indicators in metadata
        const isSuperAdmin = 
          metadata.role === 'SUPERADMIN' || 
          metadata.isSuperAdmin === true || 
          metadata.is_superadmin === true;
        
        console.log('[Profile API] Creating profile for user, superadmin:', isSuperAdmin);
        
        profile = await prisma.profile.create({
          data: {
            userId,
            firstName: metadata.firstName || metadata.first_name || null,
            lastName: metadata.lastName || metadata.last_name || null,
            avatarUrl: metadata.avatarUrl || metadata.avatar_url || null,
            role: isSuperAdmin ? UserRole.SUPERADMIN : UserRole.USER,
            active: true
          }
        });
        
        console.log('[Profile API] Profile created successfully');
      } catch (error) {
        console.error("[Profile API] Error creating profile:", error);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }
    } else {
      console.log('[Profile API] Existing profile found for user');
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[Profile API] Error in profile endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Try to extract bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    let sessionData;
    
    // If we have an auth header, use it to get the session
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          sessionData = data;
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }
    
    // Fallback to cookies if header auth failed
    if (!sessionData) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      sessionData = data;
    }

    const userId = sessionData.user.id;
    const requestData = await request.json();
    const { firstName, lastName, avatarUrl, active } = requestData;

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
        return NextResponse.json(newProfile);
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
      
      return NextResponse.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// POST: Create a new profile for the current authenticated user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, firstName, lastName, avatarUrl, role } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: "Profile already exists" },
          { status: 409 }
        );
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

      return NextResponse.json(newProfile, { status: 201 });
    } catch (error) {
      console.error("Database error creating profile:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: "Database error creating profile", details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in profile creation endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create profile", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GETAll(req: Request) {
  try {
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

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
