import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
    // Initialize Supabase client with Next.js 14 cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookies().get(name)?.value;
          },
          set(name, value, options) {
            // Not setting cookies in API routes
          },
          remove(name, options) {
            // Not removing cookies in API routes
          }
        }
      }
    );
    
    // Get authenticated user using getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API:userId] ${authError?.message || 'No active session found'}`);
      return NextResponse.json(
        { error: 'Not authenticated', detail: authError?.message || 'Auth session missing!' },
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
    // Initialize Supabase client with Next.js 14 cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookies().get(name)?.value;
          },
          set(name, value, options) {
            // Not setting cookies in API routes
          },
          remove(name, options) {
            // Not removing cookies in API routes
          }
        }
      }
    );
    
    // Get authenticated user using getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API:userId] ${authError?.message || 'No active session found'}`);
      return NextResponse.json(
        { error: 'Not authenticated', detail: authError?.message || 'Auth session missing!' },
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
