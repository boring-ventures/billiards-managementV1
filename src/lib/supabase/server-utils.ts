import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase server client for API routes using Next.js App Router
 * This handles the correct cookie access pattern for both async and sync contexts
 */
export function createSupabaseRouteHandlerClient() {
  return createServerClient(
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
        async set() {
          // Not needed for API routes
        },
        async remove() {
          // Not needed for API routes
        }
      }
    }
  );
}

/**
 * Helper to safely get all cookies in both async and sync contexts
 */
export async function getAllCookies() {
  const cookieStore = cookies();
  let allCookies: any[] = [];
  
  try {
    // Try async API first
    const cookieStoreResult = await cookieStore;
    allCookies = cookieStoreResult.getAll();
  } catch (err) {
    // Fallback to sync API
    // @ts-ignore - Access sync API
    allCookies = cookieStore.getAll?.() || [];
  }
  
  return allCookies;
} 