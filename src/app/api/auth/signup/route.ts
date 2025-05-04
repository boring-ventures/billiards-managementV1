import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth-server-utils";
import { z } from "zod";

// Schema for sign-up validation
const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate input
    const { email, password, firstName, lastName } = signUpSchema.parse(body);
    
    // Create Supabase client with cookie handling
    const supabase = createServerSupabaseClient();
    
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
        },
      },
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
        message: "User registered successfully"
      },
      { status: 201 }
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
    
    console.error("Sign-up error:", error);
    
    return NextResponse.json(
      { 
        error: "Registration failed",
        success: false
      },
      { status: 500 }
    );
  }
} 