import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import type { Prisma, Profile } from "@prisma/client";

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check if there's a userId query parameter (for compatibility with by-id endpoint)
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    if (userIdParam) {
      // Redirect to the by-id endpoint
      const byIdEndpoint = '/api/profile/by-id';
      try {
        const response = await fetch(`${new URL(request.url).origin}${byIdEndpoint}?userId=${userIdParam}`, {
          headers: {
            cookie: request.headers.get('cookie') || '',
            authorization: request.headers.get('authorization') || ''
          }
        });
        
        // Read the response body as text first to avoid decoding issues
        const responseText = await response.text();
        
        // Set proper content type without encoding to prevent ERR_CONTENT_DECODING_FAILED
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        
        // Return the response with proper headers
        return new NextResponse(responseText, {
          status: response.status,
          headers: headers
        });
      } catch (fetchError) {
        console.error(`[API:profile] Error proxying to by-id endpoint: ${fetchError}`);
        return NextResponse.json(
          { error: "Failed to fetch profile", detail: "Internal routing error" },
          { status: 500 }
        );
      }
    }
    
    // Initialize the Supabase client with cookie handling for Next.js 14
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            // For Next.js 14
            return cookies().get(name)?.value;
          },
          set(name, value, options) {
            // For Next.js 14 - don't try to set cookies in API routes,
            // as cookies() returns a read-only object in server actions and API routes
          },
          remove(name, options) {
            // For Next.js 14 - don't try to remove cookies in API routes
          }
        }
      }
    );
    
    // Get the authenticated user - ALWAYS use getUser() for reliable server-side auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API:profile] Authentication error: ${authError?.message || 'No active session'}`);
      
      // Set proper headers to prevent encoding issues
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
    
    console.log(`[API:profile] Authenticated user ID: ${user.id}`);
    
    // Fetch the user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
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
        
        console.log(`[API:profile] Creating new profile for user ${user.id}`);
        
        const newProfile = await prisma.profile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
            role: UserRole.USER, // Default role for new users
            active: true,
            companyId: null
          },
        });
        
        console.log(`[API:profile] New profile created successfully`);
        return NextResponse.json({ profile: newProfile });
      } catch (createError: any) {
        // Unique constraint error means someone else created the profile (race condition)
        if (createError.code === 'P2002') {
          const existingProfile = await prisma.profile.findUnique({
            where: { userId: user.id },
          });
          
          if (existingProfile) {
            return NextResponse.json({ profile: existingProfile });
          }
        }
        
        console.error(`[API:profile] Error creating profile: ${createError}`);
        return NextResponse.json(
          { error: "Failed to create profile", detail: createError.message },
          { status: 500 }
        );
      }
    }
    
    // Return the profile with proper headers to prevent encoding issues
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ profile }),
      { 
        status: 200,
        headers: headers
      }
    );
  } catch (error: any) {
    console.error(`[API:profile] Unexpected error: ${error}`);
    
    // Set proper headers to prevent encoding issues
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { 
        status: 500,
        headers: headers
      }
    );
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    // Create Supabase client with the new SSR package
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name);
            return cookie?.value || null;
          },
          set() {
            // Can't set cookies in API routes
          },
          remove() {
            // Can't remove cookies in API routes
          }
        }
      }
    );

    // Try to extract bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    let userId = null;
    
    // First try Authorization header if present
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          userId = data.user.id;
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }
    
    // Fallback to cookies if header auth failed
    if (!userId) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return NextResponse.json({ error: "Not authenticated", detail: "No active session" }, { status: 401 });
      }
      userId = data.user.id;
    }

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
