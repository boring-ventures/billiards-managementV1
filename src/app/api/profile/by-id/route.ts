import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils";
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
    // Add detailed debugging for request headers and cookies
    console.log('[DEBUG] Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('[DEBUG] Cookie header:', request.headers.get('cookie'));
    
    const cookieStore = cookies();
    const supabase = createSupabaseRouteHandlerClient();
    
    // Log cookies and auth headers for debugging
    const authHeader = request.headers.get('authorization');
    console.log('[Profile By-ID API] Auth header present:', !!authHeader);
    console.log('[Profile By-ID API] Cookie header present:', !!request.headers.get('cookie'));
    
    // First, authenticate the requesting user (admin check)
    let requestingUserId = null;
    
    // Try Authorization header first if present (Bearer token)
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          requestingUserId = data.user.id;
          console.log('[Profile By-ID API] Requester found via token:', requestingUserId);
        } else {
          console.warn('[Profile By-ID API] Invalid token in header:', error?.message);
        }
      } catch (error) {
        console.error('[Profile By-ID API] Error verifying token:', error);
      }
    }
    
    // Fallback to cookies if header auth failed
    if (!requestingUserId) {
      try {
        console.log('[Profile By-ID API] Trying cookies for authentication');
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('[Profile By-ID API] Cookie auth error:', error.message);
          return NextResponse.json(
            { error: error?.message || "Not authenticated" },
            { status: 401 }
          );
        }
        
        if (!data?.user) {
          console.error('[Profile By-ID API] No user found in cookie auth');
          return NextResponse.json(
            { error: "User not found" },
            { status: 401 }
          );
        }
        
        requestingUserId = data.user.id;
        console.log('[Profile By-ID API] Requester found via cookies:', requestingUserId);
      } catch (error) {
        console.error('[Profile By-ID API] Supabase getUser error:', error);
        return NextResponse.json({ error: "Authentication error" }, { status: 401 });
      }
    }
    
    // If we still can't identify the requesting user, they're not authenticated
    if (!requestingUserId) {
      console.error('[Profile By-ID API] Could not authenticate requesting user');
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
    
    console.log(`[Profile By-ID API] Looking up profile for user: ${targetUserId}`);
    
    // Check if requesting user is authorized to access the target profile
    // This requires either being the same user or having admin privileges
    if (targetUserId !== requestingUserId) {
      // Check if the requesting user has admin privileges
      const requestingProfile = await prisma.profile.findUnique({
        where: { userId: requestingUserId },
      });
      
      const isAdmin = requestingProfile?.role === UserRole.ADMIN || 
                     requestingProfile?.role === UserRole.SUPERADMIN;
      
      if (!isAdmin) {
        console.error('[Profile By-ID API] Unauthorized access attempt');
        return NextResponse.json(
          { error: "You are not authorized to access this profile" },
          { status: 403 }
        );
      }
    }
    
    // Fetch the target user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
    });
    
    if (!profile) {
      console.log(`[Profile By-ID API] Profile not found for user: ${targetUserId}`);
      
      // Get user info from Supabase to create a skeleton profile
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(targetUserId);
      
      if (userError || !userData?.user) {
        console.error('[Profile By-ID API] User not found in Supabase:', userError?.message);
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
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
        
        // Add auth information to the response headers
        const headers = new Headers();
        headers.set('X-Profile-Created', 'true');
        
        return NextResponse.json({ profile: newProfile }, { headers });
      } catch (error) {
        console.error('[Profile By-ID API] Error creating profile:', error);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }
    }
    
    console.log('[Profile By-ID API] Retrieved profile successfully');
    
    // Add auth information to the response headers
    const headers = new Headers();
    headers.set('X-Auth-Method', requestingUserId ? 'success' : 'none');
    
    return NextResponse.json({ profile }, { headers });
  } catch (error) {
    console.error('[Profile By-ID API] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
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