import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = (await params).userId;
    console.log("[API:userId] Fetching specific profile for user ID:", userId);

    // Create Supabase client
    try {
      const supabase = createRouteHandlerClient({ cookies });

      // Get the current user's session
      console.log("[API:userId] Attempting to get Supabase session");
      const sessionResult = await supabase.auth.getSession();
      
      if (!sessionResult || sessionResult.error) {
        console.error("[API:userId] Session error:", sessionResult?.error);
        return NextResponse.json(
          { error: "Authentication failed", details: sessionResult?.error?.message },
          { status: 401 }
        );
      }
      
      const session = sessionResult.data.session;
      
      if (!session) {
        console.error("[API:userId] No active session found");
        return NextResponse.json(
          { error: "Not authenticated", detail: "No active session" },
          { status: 401 }
        );
      }

      // Only allow users to view their own profile (or admin users to view any profile)
      const currentUser = session.user;
      console.log("[API:userId] Current user ID:", currentUser.id);
      console.log("[API:userId] User metadata:", JSON.stringify(currentUser.user_metadata));
      
      try {
        // Get the current user's profile to check permissions
        const userProfile = await prisma.profile.findUnique({
          where: { userId: currentUser.id },
        });

        // Check if user is a superadmin based on metadata if no profile exists
        const userMetadata = currentUser.user_metadata || {};
        let isSuperadmin = userProfile?.role === "SUPERADMIN";
        
        if (!userProfile) {
          // Handle case where user doesn't have a profile yet but might be a superadmin
          isSuperadmin = 
            userMetadata.role === "SUPERADMIN" || 
            userMetadata.isSuperAdmin === true ||
            (typeof userMetadata.is_superadmin === 'boolean' && userMetadata.is_superadmin);
          
          console.log("[API:userId] User has superadmin role in metadata:", isSuperadmin);
          
          // If the user is a superadmin or looking at their own profile, create a profile for them
          if (isSuperadmin || userId === currentUser.id) {
            console.log("[API:userId] Creating profile for user");
            
            try {
              const role = isSuperadmin ? "SUPERADMIN" : "USER";
              const newProfile = await prisma.profile.create({
                data: {
                  userId: currentUser.id,
                  firstName: userMetadata.firstName || userMetadata.first_name || null,
                  lastName: userMetadata.lastName || userMetadata.last_name || null,
                  avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
                  role,
                  active: true,
                },
              });
              
              console.log("[API:userId] Profile created successfully for current user");
              
              // Update userProfile and isSuperadmin with newly created data
              isSuperadmin = role === "SUPERADMIN";
            } catch (error: any) {
              console.error("[API:userId] Error creating profile for current user:", error);
              
              // If it's a unique constraint error, the profile might have been created in a race condition
              if (error.code !== 'P2002') {
                return NextResponse.json(
                  { error: "Failed to create profile for current user", detail: error.message },
                  { status: 500 }
                );
              }
              
              // If there was a unique constraint error, try to fetch the profile again
              const existingProfile = await prisma.profile.findUnique({
                where: { userId: currentUser.id },
              });
              
              if (existingProfile) {
                isSuperadmin = existingProfile.role === "SUPERADMIN";
              }
            }
          }
        }

        // Enforce access control: only allow users to view their own profile or superadmins to view any profile
        if (userId !== currentUser.id && !isSuperadmin) {
          console.error("[API:userId] Unauthorized access attempt");
          return NextResponse.json(
            { error: "Unauthorized to view this profile" },
            { status: 403 }
          );
        }

        // Fetch the requested profile
        const profile = await prisma.profile.findUnique({
          where: { userId },
        });

        if (!profile) {
          console.error("[API:userId] Profile not found for requested user ID:", userId);
          
          // If this is the current user, create a profile for them
          if (userId === currentUser.id) {
            console.log("[API:userId] Creating profile for current user");
            
            try {
              // Extract name from user email if not available in metadata
              const emailName = currentUser.email ? currentUser.email.split('@')[0] : null;
              const emailNameParts = emailName ? emailName.split('.') : [];
              
              const userMetadata = currentUser.user_metadata || {};
              
              // Get first and last name with several fallback options
              const firstName = 
                userMetadata.firstName || 
                userMetadata.first_name || 
                userMetadata.given_name ||
                userMetadata.name?.split(' ')[0] || 
                (emailNameParts.length > 0 ? 
                  emailNameParts[0].charAt(0).toUpperCase() + emailNameParts[0].slice(1) : 
                  (currentUser.email ? currentUser.email.split('@')[0] : "User"));
              
              const lastName = 
                userMetadata.lastName || 
                userMetadata.last_name || 
                userMetadata.family_name || 
                userMetadata.name?.split(' ').slice(1).join(' ') || 
                (emailNameParts.length > 1 ? 
                  emailNameParts[1].charAt(0).toUpperCase() + emailNameParts[1].slice(1) : "");
              
              console.log("[API:userId] Extracted name info - First:", firstName, "Last:", lastName);
              
              // Determine role - if user metadata indicates superadmin, set that role
              const isSuperadmin = 
                userMetadata.role === "SUPERADMIN" || 
                userMetadata.isSuperAdmin === true ||
                (typeof userMetadata.is_superadmin === 'boolean' && userMetadata.is_superadmin);
              
              const role = isSuperadmin ? "SUPERADMIN" : "USER";
              
              const newProfile = await prisma.profile.create({
                data: {
                  userId,
                  firstName,
                  lastName,
                  avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
                  role,
                  active: true,
                },
              });
              
              console.log(`[API:userId] Profile created successfully for ${role}`);
              return NextResponse.json({ profile: newProfile });
            } catch (error: any) {
              console.error("[API:userId] Error creating profile for user:", error);
              
              // If it's a unique constraint error, try to fetch the profile again
              if (error.code === 'P2002') {
                const existingProfile = await prisma.profile.findUnique({
                  where: { userId },
                });
                
                if (existingProfile) {
                  console.log("[API:userId] Found profile after creation attempt");
                  return NextResponse.json({ profile: existingProfile });
                }
              }
              
              return NextResponse.json(
                { error: "Failed to create profile", detail: error.message },
                { status: 500 }
              );
            }
          }
          
          return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        console.log("[API:userId] Profile found, returning data");
        return NextResponse.json({ profile });
      } catch (error: any) {
        console.error("[API:userId] Error processing user profile:", error);
        return NextResponse.json(
          { error: "Failed to process user profile", detail: error.message },
          { status: 500 }
        );
      }
    } catch (cookieError: any) {
      console.error("[API:userId] Error accessing cookies:", cookieError);
      return NextResponse.json(
        { error: "Cookie store initialization failed", detail: cookieError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[API:userId] Error in profile endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile", detail: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    console.log("[API:userId] Updating profile for user ID:", userId);

    // Create Supabase client
    try {
      const supabase = createRouteHandlerClient({ cookies });
      
      // Get the current user's session
      console.log("[API:userId] Getting auth session for update");
      const sessionResult = await supabase.auth.getSession();
      
      if (!sessionResult || sessionResult.error) {
        console.error("[API:userId] Session error during update:", sessionResult?.error);
        return NextResponse.json(
          { error: "Authentication failed", details: sessionResult?.error?.message },
          { status: 401 }
        );
      }
      
      const session = sessionResult.data.session;
      
      if (!session) {
        console.error("[API:userId] No active session found during update");
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      // Only allow users to update their own profile (or admin users to update any profile)
      const currentUser = session.user;
      console.log("[API:userId] Current user performing update:", currentUser.id);
      
      try {
        const userProfile = await prisma.profile.findUnique({
          where: { userId: currentUser.id },
        });

        // Check superadmin status from profile or metadata
        const userMetadata = currentUser.user_metadata || {};
        let isSuperadmin = userProfile?.role === "SUPERADMIN";
        
        if (!userProfile) {
          isSuperadmin = 
            userMetadata.role === "SUPERADMIN" || 
            userMetadata.isSuperAdmin === true ||
            (typeof userMetadata.is_superadmin === 'boolean' && userMetadata.is_superadmin);
        }

        if (userId !== currentUser.id && !isSuperadmin) {
          console.error("[API:userId] Unauthorized update attempt");
          return NextResponse.json(
            { error: "Unauthorized to update this profile" },
            { status: 403 }
          );
        }

        const json = await request.json();
        console.log("[API:userId] Update data:", JSON.stringify(json));

        // Perform the update
        const updatedProfile = await prisma.profile.update({
          where: { userId },
          data: {
            firstName: json.firstName !== undefined ? json.firstName : undefined,
            lastName: json.lastName !== undefined ? json.lastName : undefined,
            avatarUrl: json.avatarUrl !== undefined ? json.avatarUrl : undefined,
            active: json.active !== undefined ? json.active : undefined,
            // Allow role updates only for superadmins
            role: isSuperadmin && json.role !== undefined ? json.role : undefined,
          },
        });

        console.log("[API:userId] Profile updated successfully");
        return NextResponse.json({ profile: updatedProfile });
      } catch (error: any) {
        console.error("[API:userId] Error updating profile:", error);
        return NextResponse.json(
          { error: "Failed to update profile", detail: error.message },
          { status: 500 }
        );
      }
    } catch (cookieError: any) {
      console.error("[API:userId] Cookie error during update:", cookieError);
      return NextResponse.json(
        { error: "Cookie initialization failed", detail: cookieError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[API:userId] Unhandled error in profile update:", error);
    return NextResponse.json(
      { error: "Failed to update profile", detail: error.message },
      { status: 500 }
    );
  }
}
