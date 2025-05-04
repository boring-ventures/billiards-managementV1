import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Create a Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get current user with verified token
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // Return specific error for missing session
      return NextResponse.json(
        { 
          authenticated: false, 
          error: error?.message || "No active session"
        },
        { status: 401 }
      );
    }
    
    // Get the user's profile
    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });
    
    // Return session data
    return NextResponse.json({
      authenticated: true,
      user,
      profile,
    });
  } catch (error) {
    console.error("Session check error:", error);
    
    return NextResponse.json(
      { 
        authenticated: false, 
        error: "Failed to verify session"
      },
      { status: 500 }
    );
  }
} 