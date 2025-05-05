import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { AUTH_TOKEN_KEY } from "@/lib/auth-utils";

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
    
    // Create a JSON response with cookies that we'll modify
    const response = NextResponse.json(
      { success: true, redirect: '/dashboard' },
      { status: 200 }
    );
    
    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return req.cookies.get(name)?.value;
          },
          set(name, value, options) {
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: "lax",
              path: "/",
              secure: process.env.NODE_ENV === "production",
            });
          },
          remove(name, options) {
            response.cookies.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
              path: "/",
            });
          },
        },
      }
    );
    
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
    
    // Extract session data to manually set the auth cookie
    const { access_token, refresh_token, expires_at, expires_in } = data.session;
    
    // Sanitize the user object to include only necessary fields
    const sanitizedUser = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      app_metadata: data.user.app_metadata,
      user_metadata: data.user.user_metadata,
      aud: data.user.aud
    };
    
    // Create the auth cookie value
    const authCookieValue = JSON.stringify({
      access_token,
      refresh_token,
      expires_at,
      expires_in,
      token_type: 'bearer',
      type: 'access',
      provider: 'email',
      user: sanitizedUser
    });
    
    // Set the auth cookie that Supabase uses for session management
    response.cookies.set({
      name: AUTH_TOKEN_KEY,
      value: authCookieValue,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    });
    
    return response;
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