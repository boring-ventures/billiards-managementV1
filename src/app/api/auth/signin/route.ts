import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth-utils";
import { z } from "zod";

// Schema for sign-in validation
const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate input
    const { email, password } = signInSchema.parse(body);
    
    // Create Supabase client with cookie handling
    const supabase = createServerSupabaseClient();
    
    // Sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          success: false 
        }, 
        { status: 400 }
      );
    }
    
    // Return the session
    return NextResponse.json(
      { 
        success: true, 
        data,
        message: "Signed in successfully"
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.errors,
          success: false
        },
        { status: 400 }
      );
    }
    
    console.error("Sign-in error:", error);
    
    return NextResponse.json(
      { 
        error: "Authentication failed",
        success: false
      },
      { status: 500 }
    );
  }
} 