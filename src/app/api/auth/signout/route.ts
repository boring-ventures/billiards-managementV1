import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth-utils";

export async function POST() {
  try {
    // Create a Supabase client using our helper function
    const supabase = createServerSupabaseClient();

    // Sign out from Supabase authentication
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign-out error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Return a success response and redirect to sign-in page
    return NextResponse.json(
      { success: true, message: "Signed out successfully" },
      { 
        status: 200,
        headers: {
          'Location': '/sign-in'
        }
      }
    );
  } catch (error) {
    console.error("Sign-out error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign out" },
      { status: 500 }
    );
  }
} 