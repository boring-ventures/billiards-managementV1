import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Create server client with proper cookies handling
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            const cookieStore = cookies();
            return cookieStore.get(name)?.value;
          },
          set() {
            // Not setting cookies in API routes
          },
          remove() {
            // Not removing cookies in API routes
          }
        }
      }
    );
    
    // Get authenticated user session - using getUser() for reliable authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Store the authenticated user ID for access control checks
    let requestingUserId = null;
    
    if (user) {
      requestingUserId = user.id;
      console.log(`[Profile By-ID API] Authenticated user: ${requestingUserId.slice(0, 6)}...`);
    } else {
      console.warn('[Profile By-ID API] Cookie auth error:', authError?.message || 'Auth session missing!');
      
      // Set explicit headers to avoid content encoding issues
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Not authenticated", detail: authError?.message || 'Auth session missing!' }),
        { 
          status: 401,
          headers: headers
        }
      );
    }
    
    // If the user is not looking up their own profile, check permissions
    if (targetUserId !== requestingUserId) {
      console.log('[Profile By-ID API] User requesting another profile, checking permissions');
      
      // Get the requester's profile to check role
      const requesterProfile = await prisma.profile.findUnique({
        where: { userId: requestingUserId },
        select: { role: true }
      });
      
      // Only superadmins and admins can view other profiles
      const isSuperAdmin = requesterProfile?.role === UserRole.SUPERADMIN;
      const isAdmin = requesterProfile?.role === UserRole.ADMIN;
      
      if (!isSuperAdmin && !isAdmin) {
        console.warn('[Profile By-ID API] Access denied - only admins and superadmins can view other profiles');
        
        // Set explicit headers to avoid content encoding issues
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
      
      console.log('[Profile By-ID API] Permission granted to view profile');
    }
    
    // Check if the profile exists
    const profile = await prisma.profile.findUnique({
      where: { userId: targetUserId }
    });
    
    if (!profile) {
      console.log(`[Profile By-ID API] Profile not found for user: ${targetUserId}`);
      
      // Get user info from Supabase to create a skeleton profile
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(targetUserId);
      
      if (userError || !userData?.user) {
        console.error('[Profile By-ID API] User not found in Supabase:', userError?.message);
        
        // Set explicit headers to avoid content encoding issues
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
      
      // Extract user metadata and create a basic profile
      const metadata = userData.user.user_metadata as Record<string, any> || {};
      const isSuperAdmin = 
        metadata.role === 'SUPERADMIN' || 
        metadata.isSuperAdmin === true || 
        metadata.is_superadmin === true;
      
      try {
        // Create a new profile
        const newProfile = await prisma.profile.create({
          data: {
            userId: targetUserId,
            firstName: metadata.firstName || metadata.first_name || null,
            lastName: metadata.lastName || metadata.last_name || null,
            avatarUrl: metadata.avatarUrl || metadata.avatar_url || null,
            role: isSuperAdmin ? UserRole.SUPERADMIN : UserRole.USER,
            active: true
          }
        });
        
        console.log('[Profile By-ID API] Created new profile for user');
        
        // Set explicit headers for response
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('X-Profile-Created', 'true');
        
        return new NextResponse(
          JSON.stringify({ profile: newProfile }),
          { 
            status: 200,
            headers: headers
          }
        );
      } catch (error) {
        console.error('[Profile By-ID API] Error creating profile:', error);
        
        // Set explicit headers to avoid content encoding issues
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        return new NextResponse(
          JSON.stringify({ error: "Failed to create profile" }),
          { 
            status: 500,
            headers: headers
          }
        );
      }
    }
    
    console.log('[Profile By-ID API] Retrieved profile successfully');
    
    // Set explicit headers for response
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('X-Auth-Method', requestingUserId ? 'success' : 'none');
    
    return new NextResponse(
      JSON.stringify({ profile }),
      { 
        status: 200,
        headers: headers
      }
    );
  } catch (error) {
    console.error('[Profile By-ID API] Unexpected error:', error);
    
    // Set explicit headers to avoid content encoding issues
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
    const supabase = createSupabaseRouteHandlerClient();
    
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