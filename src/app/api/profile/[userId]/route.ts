import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, validateSession } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

// Helper function to validate user access to profile
async function validateAccess(requestedUserId: string, authenticatedUser: any) {
  // If user is requesting their own profile, always allow
  if (requestedUserId === authenticatedUser.id) {
    return true;
  }
  
  // Check if user has admin/super-admin role by looking up profile
  try {
    const userProfile = await prisma.profile.findUnique({
      where: { userId: authenticatedUser.id },
      select: { role: true }
    });
    
    return userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

// GET profile by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // First validate the session - ALWAYS use getUser() over getSession()
    const { user, error } = await validateSession();
    
    if (error || !user) {
      console.error(`[API:userId] ${error || 'No active session found'}`);
      return NextResponse.json(
        { error: 'Not authenticated', detail: error || 'No active session' },
        { status: 401 }
      );
    }
    
    // Check if the user has permission to access this profile
    const hasAccess = await validateAccess(params.userId, user);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', detail: 'You do not have permission to access this profile' },
        { status: 403 }
      );
    }
    
    // Get the profile from the database
    const profile = await prisma.profile.findUnique({
      where: { userId: params.userId }
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Not found', detail: 'Profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error(`[API:userId] Error fetching profile:`, error);
    return NextResponse.json(
      { error: 'Internal server error', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

// UPDATE profile by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // First validate the session - ALWAYS use getUser() over getSession()
    const { user, error } = await validateSession();
    
    if (error || !user) {
      console.error(`[API:userId] ${error || 'No active session found'}`);
      return NextResponse.json(
        { error: 'Not authenticated', detail: error || 'No active session' },
        { status: 401 }
      );
    }
    
    // Check if the user has permission to update this profile
    const hasAccess = await validateAccess(params.userId, user);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', detail: 'You do not have permission to update this profile' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate update data
    const { firstName, lastName, companyId, avatarUrl, role, active } = body;
    
    // Update the profile
    const updatedProfile = await prisma.profile.update({
      where: { userId: params.userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(companyId !== undefined && { companyId }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error(`[API:userId] Error updating profile:`, error);
    return NextResponse.json(
      { error: 'Internal server error', detail: (error as Error).message },
      { status: 500 }
    );
  }
}
