import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth-utils";

export async function POST() {
  try {
    // Create a Supabase client
    const supabase = createServerSupabaseClient();
    
    // Attempt to refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Token refresh error:", error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to refresh token" 
      },
      { status: 500 }
    );
  }
} 