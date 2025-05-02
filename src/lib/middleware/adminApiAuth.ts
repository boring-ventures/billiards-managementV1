/**
 * Admin API middleware to ensure only superadmins can access admin endpoints
 * This provides a security layer for all admin operations
 */
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';
import { logAdminOperation } from '../serverClient';

/**
 * Middleware to verify the user is a superadmin with specific privileges
 * Returns null if authenticated, otherwise returns an error response
 */
export async function verifySuperAdmin(
  req: NextRequest,
  operation?: string // Optional operation to log
): Promise<NextResponse | null> {
  try {
    // Get the authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error('Admin API auth error:', error?.message || 'No session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // First check app_metadata for role (faster than database query)
    const role = session.user.app_metadata?.role as UserRole;
    
    if (role === UserRole.SUPERADMIN) {
      // Log the operation if provided
      if (operation) {
        const url = req.nextUrl.pathname;
        const method = req.method;
        await logAdminOperation(
          operation,
          { url, method },
          userId
        );
      }
      
      // User is a superadmin, allow request to proceed
      return null;
    }
    
    // If not found in app_metadata or not a superadmin, check database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('userId', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('Admin API profile fetch error:', profileError?.message || 'No profile');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify user is a superadmin
    if (profile.role !== UserRole.SUPERADMIN) {
      console.warn(`Unauthorized admin API access attempt by user ${userId} with role ${profile.role}`);
      return NextResponse.json(
        { error: 'Forbidden: Requires superadmin privileges' },
        { status: 403 }
      );
    }
    
    // Log the operation if provided
    if (operation) {
      const url = req.nextUrl.pathname;
      const method = req.method;
      await logAdminOperation(
        operation,
        { url, method },
        userId
      );
    }
    
    // User is a superadmin, allow request to proceed
    return null;
  } catch (error) {
    console.error('Error in verifySuperAdmin middleware:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 