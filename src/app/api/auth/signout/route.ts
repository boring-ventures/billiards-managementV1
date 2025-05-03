import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  // Create a Supabase client using the SSR package
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = cookies();
            let cookieValue: string | null = null;
            
            try {
              // Await the promise
              const allCookies = await cookieStore;
              // Get the specific cookie value
              cookieValue = allCookies.get(name)?.value || null;
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieValue = cookieStore.get?.(name)?.value || null;
            }
            
            return cookieValue;
          } catch (error) {
            console.error('[Cookie] Error reading cookie:', error);
            return null;
          }
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = cookies();
            
            try {
              // Await the promise and set the cookie
              const store = await cookieStore;
              store.set(name, value, options);
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, value, options);
            }
          } catch (error) {
            console.error('[Cookie] Error setting cookie:', error);
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = cookies();
            
            try {
              // Await the promise and remove the cookie
              const store = await cookieStore;
              store.set(name, '', { ...options, maxAge: 0 });
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, '', { ...options, maxAge: 0 });
            }
          } catch (error) {
            console.error('[Cookie] Error removing cookie:', error);
          }
        }
      }
    }
  );

  // Sign out from Supabase authentication
  await supabase.auth.signOut();

  // Return a success response and redirect to sign-in page
  return NextResponse.json(
    { success: true },
    { 
      status: 200,
      headers: {
        'Location': '/sign-in'
      }
    }
  );
} 