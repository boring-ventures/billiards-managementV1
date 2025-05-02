// Authentication metadata management utilities
// This file handles app_metadata operations for roles and company assignments
import 'server-only';
import { UserRole } from '@prisma/client';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { AuthMetadata, UserMetadata } from '@/types/auth/metadata';

/**
 * Get a Supabase admin client for metadata management
 * This uses the service role key which should ONLY be used server-side
 */
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for auth metadata operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Update a user's app_metadata with role and companyId
 * This requires the service role key and should only be called server-side
 */
export async function updateUserAuthMetadata(
  userId: string,
  metadata: Partial<AuthMetadata>
): Promise<void> {
  try {
    const adminClient = getAdminClient();
    
    // Get current user data first
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(userId);
    
    if (getUserError || !userData?.user) {
      console.error('Error fetching user for metadata update:', getUserError);
      throw new Error(`Failed to fetch user: ${getUserError?.message}`);
    }
    
    // Merge with existing app_metadata
    const currentMetadata = userData.user.app_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
      // Always mark as initialized when updating
      initialized: true
    };
    
    // Update user with new metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { app_metadata: updatedMetadata }
    );
    
    if (updateError) {
      console.error('Error updating user app_metadata:', updateError);
      throw new Error(`Failed to update user metadata: ${updateError.message}`);
    }
    
    console.log(`Updated app_metadata for user ${userId}`);
  } catch (error) {
    console.error('Error in updateUserAuthMetadata:', error);
    throw error;
  }
}

/**
 * Initialize basic app_metadata for a new user
 * Sets default role and marks as initialized
 */
export async function initializeUserMetadata(
  userId: string,
  initialRole: UserRole = UserRole.USER
): Promise<void> {
  await updateUserAuthMetadata(userId, {
    role: initialRole,
    companyId: null,
    initialized: true
  });
}

/**
 * Update user's role in app_metadata
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  await updateUserAuthMetadata(userId, { role });
}

/**
 * Update user's company assignment in app_metadata
 */
export async function updateUserCompany(
  userId: string,
  companyId: string | null
): Promise<void> {
  await updateUserAuthMetadata(userId, { companyId });
}

/**
 * Retrieve auth metadata from JWT claims or fallback to database
 * This works with the current session and doesn't require admin privileges
 */
export async function getAuthMetadataFromSession(): Promise<AuthMetadata | null> {
  try {
    // Use route handler client to get the session with cookies
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      console.error('Error fetching session for metadata:', error);
      return null;
    }
    
    // Extract metadata from JWT claims
    const { user } = data.session;
    const appMetadata = user.app_metadata || {};
    
    // Verify the metadata has our expected structure
    if (appMetadata.initialized) {
      return {
        role: appMetadata.role || UserRole.USER,
        companyId: appMetadata.companyId || null,
        initialized: true
      };
    }
    
    // If not properly initialized, return null to trigger fallback
    return null;
  } catch (error) {
    console.error('Error retrieving auth metadata:', error);
    return null;
  }
} 