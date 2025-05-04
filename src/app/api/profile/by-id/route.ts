import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// Helper function for creating Supabase client with proper cookie handling
function createSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // In Next.js 14, cookies() is synchronous
          return cookies().get(name)?.value;
        },
        set() {
          // Not needed in API routes
        },
        remove() {
          // Not needed in API routes
        },
      },
    }
  );
}

/**
 * GET: Fetch a user's profile by userId
 * Endpoint: /api/profile/by-id?userId={userId}
 * Used for superadmin user switching
 */
export async function GET(request: NextRequest) {
  try {
    // Get the userId from the query parameter
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    
    if (!targetUserId) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Missing userId parameter" }),
        { 
          status: 400,
          headers: headers
        }
      );
    }
    
    // Create Supabase client using our helper function
    const supabase = createSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[Profile By-ID API] Cookie auth error:", authError?.message || "Auth session missing!");
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Not authenticated", detail: authError?.message || "Auth session missing!" }),
        { 
          status: 401,
          headers: headers
        }
      );
    }
    
    console.log("[Profile By-ID API] Authenticated user:", user.id);
    
    // Check user permissions - users can only view:
    // 1. Their own profile
    // 2. If they have ADMIN or SUPERADMIN role, they can view any profile
    if (targetUserId !== user.id) {
      // Get user's profile to check role
      const requesterProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { role: true },
      });
      
      const isSuperAdmin = requesterProfile?.role === UserRole.SUPERADMIN;
      const isAdmin = requesterProfile?.role === UserRole.ADMIN;
      
      if (!isSuperAdmin && !isAdmin) {
        console.log(`[Profile By-ID API] User ${user.id} attempted to access profile ${targetUserId} without permission`);
        
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        return new NextResponse(
          JSON.stringify({ error: "Forbidden", detail: "Insufficient permissions to view this profile" }),
          { 
            status: 403,
            headers: headers
          }
        );
      }
    }
    
    // Fetch the profile data
    const profile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
    });
    
    if (!profile) {
      console.log(`[Profile By-ID API] Profile not found for user ${targetUserId}`);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Profile not found" }),
        { 
          status: 404,
          headers: headers
        }
      );
    }
    
    // Set proper content-type header
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ profile }),
      { 
        status: 200,
        headers: headers
      }
    );
  } catch (error) {
    console.error("[Profile By-ID API] Error:", error);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal server error", 
        detail: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: headers
      }
    );
  }
}

// PUT: Update profile by user ID (admin only)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            // In Next.js 14, cookies() is synchronous
            return cookies().get(name)?.value;
          },
          set() {
            // Not needed in API routes
          },
          remove() {
            // Not needed in API routes
          },
        },
      }
    );
    
    // Authenticate the requesting user
    let requestingUserId = null;
    
    // Try Authorization header first if present
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          requestingUserId = data.user.id;
        }
      } catch (error) {
        console.error('[Profile By-ID API] Error verifying token:', error);
      }
    }
    
    // Fallback to cookies if header auth failed
    if (!requestingUserId) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      requestingUserId = data.user.id;
    }
    
    // Check admin status of requesting user
    const requestingProfile = await prisma.profile.findUnique({
      where: { userId: requestingUserId },
    });
    
    const isAdmin = requestingProfile?.role === UserRole.ADMIN || 
                   requestingProfile?.role === UserRole.SUPERADMIN;
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only administrators can update other user profiles" },
        { status: 403 }
      );
    }
    
    // Get the target user ID from query parameters
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    
    if (!targetUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Parse the request data
    const requestData = await request.json();
    const { firstName, lastName, avatarUrl, role, companyId, active } = requestData;
    
    // Check if the profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId }
    });
    
    if (!existingProfile) {
      // Create new profile if it doesn't exist
      const newProfile = await prisma.profile.create({
        data: {
          userId: targetUserId,
          firstName: firstName || null,
          lastName: lastName || null,
          avatarUrl: avatarUrl || null,
          role: (role as UserRole) || UserRole.USER,
          companyId: companyId || null,
          active: active !== undefined ? active : true
        }
      });
      
      return NextResponse.json({ profile: newProfile });
    }
    
    // Update existing profile
    const updatedProfile = await prisma.profile.update({
      where: { userId: targetUserId },
      data: {
        firstName: firstName !== undefined ? firstName : existingProfile.firstName,
        lastName: lastName !== undefined ? lastName : existingProfile.lastName,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : existingProfile.avatarUrl,
        role: role !== undefined ? (role as UserRole) : existingProfile.role,
        companyId: companyId !== undefined ? companyId : existingProfile.companyId,
        active: active !== undefined ? active : existingProfile.active
      }
    });
    
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('[Profile By-ID API] Error updating profile:', error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
} 