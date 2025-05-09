/**
 * Secure Supabase client with service_role privileges
 * IMPORTANT: This client should ONLY be used in server-side code
 * This client bypasses RLS policies and has full admin access
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Check if we're in a browser environment (this is a failsafe)
if (typeof window !== 'undefined') {
  throw new Error('serverClient cannot be used in client-side code');
}

// Get environment variables with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-for-build.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-for-build-time';

// Create a warning function that won't block builds but will show in runtime
const warnIfMissingEnvVars = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Missing Supabase environment variables for service role client. ' +
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set ' +
      'for production use. Current operation will likely fail.'
    );
  }
};

/**
 * Create a Supabase admin client with service_role privileges
 * This client bypasses RLS policies and has full database access
 * ONLY use this for server-side admin operations that need to bypass RLS
 */
export const serverClient = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Creates a Supabase admin client with the provided configuration
 * Useful when you need specific options for the service role client
 */
export function createServiceRoleClient(options = {}) {
  // Check environment variables without throwing build errors
  warnIfMissingEnvVars();
  
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      ...options
    }
  );
}

/**
 * Logs an audit record for security-sensitive operations performed with the service role
 * This provides an audit trail for admin operations for security compliance
 */
export async function logAdminOperation(
  operation: string,
  details: Record<string, any>,
  performedBy: string
): Promise<void> {
  try {
    // Check environment variables without throwing build errors
    warnIfMissingEnvVars();
    
    const { error } = await serverClient
      .from('admin_audit_logs')
      .insert({
        operation,
        details,
        performed_by: performedBy,
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to log admin operation:', error);
    }
  } catch (err) {
    console.error('Error logging admin operation:', err);
  }
}

/**
 * Validates and ensures that a user has superadmin privileges
 * Throws an error if the user is not a superadmin
 */
export async function assertSuperAdmin(userId: string): Promise<void> {
  // Check environment variables without throwing build errors
  warnIfMissingEnvVars();
  
  try {
    const { data, error } = await serverClient
      .from('profiles')
      .select('role')
      .eq('userId', userId)
      .single();

    if (error || !data) {
      throw new Error('Failed to validate user permissions');
    }

    if (data.role !== 'SUPERADMIN') {
      throw new Error('Unauthorized: Requires SUPERADMIN role');
    }
  } catch (err) {
    console.error('Error validating superadmin:', err);
    throw new Error('Failed to validate user permissions');
  }
} 