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
      { 
        success: true,
        redirect: '/dashboard',
        sessionData: {} // Will be populated with non-sensitive session info
      },
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
    
    // Explicitly set the session in the response with the auth API
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
    
    // Extract session data to manually set the auth cookie
    const { access_token, refresh_token, expires_at, expires_in } = data.session;
    
    // Get the Supabase project reference for cookie naming
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown';
    const cookieName = `sb-${projectRef}-auth-token`;
    
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
    
    // Add non-sensitive session data to the response for client-side storage
    // This will help with client-side auth detection
    const responseData = {
      success: true,
      redirect: '/dashboard',
      sessionData: {
        userId: data.user.id,
        email: data.user.email,
        expires_at,
        access_token_non_sensitive: access_token.substring(0, 10) + '...' // Just for verification
      }
    };
    
    // Create a new response with the updated data
    const updatedResponse = NextResponse.json(responseData, { status: 200 });
    
    // Copy cookies from the original response
    response.cookies.getAll().forEach(cookie => {
      updatedResponse.cookies.set({
        ...cookie, // Spread the cookie properties
      });
    });
    
    // Set an explicit session cookie with appropriate options
    updatedResponse.cookies.set({
      name: cookieName,
      value: authCookieValue,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      // Make the cookie non-HttpOnly to allow client-side access for debugging
      httpOnly: false
    });
    
    // Also set the general auth token
    updatedResponse.cookies.set({
      name: AUTH_TOKEN_KEY,
      value: authCookieValue,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      // Make the cookie non-HttpOnly to allow client-side access for debugging
      httpOnly: false
    });
    
    console.log(`[API] Successfully signed in user: ${data.user.email}`);
    
    return updatedResponse;
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