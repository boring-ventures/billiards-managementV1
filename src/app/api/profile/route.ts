import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { UserRole, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  console.log("[API] Starting profile fetch request");
  
  try {
    // Check if there's a userId query parameter (for compatibility with by-id endpoint)
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    if (userIdParam) {
      console.log("[API] Fetching profile by userId param:", userIdParam);
      try {
        // Fetch the profile based on userId
        const profile = await prisma.profile.findUnique({
          where: { userId: userIdParam },
        });
        
        if (!profile) {
          console.log("[API] Profile not found for userId:", userIdParam);
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        
        console.log("[API] Found profile for userId:", userIdParam);
        return NextResponse.json({ profile });
      } catch (error) {
        console.error("[API] Error fetching profile by userId:", error);
        return NextResponse.json(
          { error: "Failed to fetch profile by userId" },
          { status: 500 }
        );
      }
    }
    
    // Regular authentication flow for current user
    // Create Supabase client
    try {
      const supabase = createRouteHandlerClient({ cookies });
      
      // Get the current user's session
      console.log("[API] Attempting to get Supabase session");
      const sessionResult = await supabase.auth.getSession();
      
      if (!sessionResult || sessionResult.error) {
        console.error("[API] Session error:", sessionResult?.error);
        return NextResponse.json(
          { error: "Authentication failed", details: sessionResult?.error?.message },
          { status: 401 }
        );
      }
      
      const session = sessionResult.data.session;
      
      if (!session) {
        console.error("[API] No active session found");
        return NextResponse.json(
          { error: "Not authenticated", detail: "No active session" },
          { status: 401 }
        );
      }

      const userId = session.user.id;
      console.log("[API] Authenticated user ID:", userId);
      console.log("[API] User metadata:", JSON.stringify(session.user.user_metadata));

      try {
        // Fetch profile from the database
        console.log("[API] Querying database for profile");
        const profile = await prisma.profile.findUnique({
          where: { userId },
        });

        if (!profile) {
          console.log("[API] Profile not found, checking if superadmin");
          
          // Extract role from user metadata
          const userMetadata = session.user.user_metadata || {};
          const isSuperadmin = 
            userMetadata.role === "SUPERADMIN" || 
            userMetadata.isSuperAdmin === true ||
            (typeof userMetadata.is_superadmin === 'boolean' && userMetadata.is_superadmin);
          
          console.log("[API] Is superadmin from metadata:", isSuperadmin);
          
          if (isSuperadmin) {
            console.log("[API] Creating superadmin profile");
            
            try {
              // Extract name from user email if not available in metadata
              const emailName = session.user.email ? session.user.email.split('@')[0] : null;
              const emailNameParts = emailName ? emailName.split('.') : [];
              
              // Get first and last name with several fallback options
              const firstName = 
                userMetadata.firstName || 
                userMetadata.first_name || 
                userMetadata.given_name ||
                userMetadata.name?.split(' ')[0] || 
                (emailNameParts.length > 0 ? 
                  emailNameParts[0].charAt(0).toUpperCase() + emailNameParts[0].slice(1) : 
                  (session.user.email ? session.user.email.split('@')[0] : "User"));
              
              const lastName = 
                userMetadata.lastName || 
                userMetadata.last_name || 
                userMetadata.family_name || 
                userMetadata.name?.split(' ').slice(1).join(' ') || 
                (emailNameParts.length > 1 ? 
                  emailNameParts[1].charAt(0).toUpperCase() + emailNameParts[1].slice(1) : "");
              
              console.log("[API] Extracted name info - First:", firstName, "Last:", lastName);
              
              // Create a minimal profile for superadmins
              const superadminProfile = await prisma.profile.create({
                data: {
                  userId,
                  firstName,
                  lastName,
                  avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
                  role: "SUPERADMIN",
                  active: true,
                },
              });
              
              console.log("[API] Superadmin profile created successfully");
              return NextResponse.json(superadminProfile);
            } catch (error: any) {
              console.error("[API] Error creating superadmin profile:", error);
              
              // Check if it's a unique constraint error (profile might have been created in a race condition)
              if (error.code === 'P2002') {
                console.log("[API] Trying to fetch profile again after unique constraint error");
                const existingProfile = await prisma.profile.findUnique({
                  where: { userId },
                });
                
                if (existingProfile) {
                  console.log("[API] Found profile after creation attempt");
                  return NextResponse.json(existingProfile);
                }
              }
              
              return NextResponse.json(
                { 
                  error: "Failed to create profile", 
                  detail: error.message || "Database error during profile creation" 
                },
                { status: 500 }
              );
            }
          }
          
          // Check if the user is in database but doesn't have a profile yet
          try {
            console.log("[API] Creating default profile for user");
            // Create a default profile
            const newProfile = await prisma.profile.create({
              data: {
                userId,
                firstName: userMetadata.firstName || userMetadata.first_name || null,
                lastName: userMetadata.lastName || userMetadata.last_name || null,
                avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
                role: "USER",
                active: true,
              },
            });
            
            console.log("[API] Default profile created successfully");
            return NextResponse.json(newProfile);
          } catch (error: any) {
            console.error("[API] Error creating default profile:", error);
            
            // Same race condition check as above
            if (error.code === 'P2002') {
              const existingProfile = await prisma.profile.findUnique({
                where: { userId },
              });
              
              if (existingProfile) {
                return NextResponse.json(existingProfile);
              }
            }
            
            return NextResponse.json(
              { error: "Profile not found and couldn't be created" },
              { status: 404 }
            );
          }
        }

        console.log("[API] Profile found, returning data");
        return NextResponse.json(profile);
      } catch (error: any) {
        console.error("[API] Database error:", error);
        return NextResponse.json(
          { error: "Database error", detail: error.message || "Error querying database" },
          { status: 500 }
        );
      }
    } catch (cookieError: any) {
      console.error("[API] Error accessing cookies:", cookieError);
      return NextResponse.json(
        { error: "Cookie store initialization failed", detail: cookieError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[API] Unhandled error in profile API:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile", detail: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();
    const { firstName, lastName, avatarUrl, active } = data;

    // Update profile in the database
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        firstName,
        lastName,
        avatarUrl,
        active,
      },
    });

    return NextResponse.json(updatedProfile);
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
    const { userId, firstName, lastName, avatarUrl } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // If userId is provided directly (during signup flow)
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

      // Create profile in the database
      const newProfile = await prisma.profile.create({
        data: {
          userId,
          firstName: firstName || null,
          lastName: lastName || null,
          avatarUrl: avatarUrl || null,
          role: "USER", // This field has a default in the schema but we set it explicitly
          active: true, // This field has a default in the schema but we set it explicitly
        },
      });

      return NextResponse.json(newProfile, { status: 201 });
    } catch (dbError) {
      console.error("Database error creating profile:", dbError);
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);
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
