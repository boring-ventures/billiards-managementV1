import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Storage key constants
const STORAGE_KEY = 'app-token';

// Global instance that is shared between calls in the same browser session
let globalInstance: ReturnType<typeof createClient> | null = null;

/**
 * Creates and returns a singleton Supabase client instance
 * This ensures we only have one Supabase client per browser session
 */
export function createSupabaseClient() {
  // For SSR, always create a fresh client
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      }
    });
  }
  
  // In browser, use global singleton
  if (globalInstance) return globalInstance;
  
  globalInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: STORAGE_KEY,
      storage: window.localStorage,
    },
  });
  
  return globalInstance;
}

// Export a singleton instance for direct imports
export const supabase = createSupabaseClient();
