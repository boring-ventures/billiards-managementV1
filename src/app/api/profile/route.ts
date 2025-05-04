import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import type { Prisma, Profile } from "@prisma/client";

// Helper function to create a Supabase client with correct cookie handling for API routes
function createSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Get cookie directly from the request
          const cookie = request.cookies.get(name);
          
          // Debug logging for auth cookies
          if (name.includes('auth') || name.includes('supabase')) {
            console.log(`[API:profile] Reading cookie: ${name} = ${cookie ? 'present' : 'not found'}`);
          }
          
          return cookie?.value || null;
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
}

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

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check if there's a userId query parameter (for compatibility with by-id endpoint)
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    // Initialize Supabase client using our helper with the request object
    const supabase = createSupabaseClient(request);
    
    if (userIdParam) {
      // Get user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error(`[API:profile] Auth error: ${authError?.message || 'No user found'}`);
        return createJsonResponse({ 
          error: "Not authenticated", 
          detail: authError?.message || 'Auth session missing!' 
        }, 401);
      }
      
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
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API:profile] Auth error: ${authError?.message || 'No user found'}`);
      return createJsonResponse({ 
        error: "Not authenticated", 
        detail: authError?.message || 'Auth session missing!' 
      }, 401);
    }
    
    console.log(`[API:profile] Authenticated user: ${user.id}`);
    
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
    
    // Initialize Supabase client using our helper
    const supabase = createSupabaseClient(request);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Not authenticated", detail: authError?.message || 'No user found' }),
        { 
          status: 401,
          headers: headers
        }
      );
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
        
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        return new NextResponse(
          JSON.stringify(newProfile),
          { 
            status: 201,
            headers: headers
          }
        );
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
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify(updatedProfile),
        { 
          status: 200,
          headers: headers
        }
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Failed to update profile" }),
        { 
          status: 500,
          headers: headers
        }
      );
    }
  } catch (error) {
    console.error("Error in profile PUT endpoint:", error);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ error: "Failed to update profile" }),
      { 
        status: 500,
        headers: headers
      }
    );
  }
}

// POST: Create a new profile for the current authenticated user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, firstName, lastName, avatarUrl, role } = data;

    if (!userId) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "User ID is required" }),
        { 
          status: 400,
          headers: headers
        }
      );
    }

    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        return new NextResponse(
          JSON.stringify({ error: "Profile already exists" }),
          { 
            status: 409,
            headers: headers
          }
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

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify(newProfile),
        { 
          status: 201,
          headers: headers
        }
      );
    } catch (error) {
      console.error("Database error creating profile:", error);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return new NextResponse(
        JSON.stringify({ error: "Database error creating profile", details: errorMessage }),
        { 
          status: 500,
          headers: headers
        }
      );
    }
  } catch (error) {
    console.error("Error in profile creation endpoint:", error);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new NextResponse(
      JSON.stringify({ error: "Failed to create profile", details: errorMessage }),
      { 
        status: 500,
        headers: headers
      }
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
