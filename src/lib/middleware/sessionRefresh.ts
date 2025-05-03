/**
 * Enhanced session refresh utility with progressive backoff and error handling
 */
import { createMiddlewareClient } from '@/lib/auth-utils';
import { NextRequest, NextResponse } from 'next/server';

// Configure retry backoff
const RETRY_BACKOFF_MS = 200; // Start with 200ms backoff
const MAX_RETRIES = 3; // Maximum number of refresh attempts
const MAX_BACKOFF_MS = 2000; // Cap at 2 seconds

// Store retry attempts in memory (per-request context)
const sessionRefreshAttempts = new Map<string, number>();

/**
 * Session refresh with progressive backoff and enhanced error handling
 * Uses a cache key based on the user's request to track retry attempts
 */
export async function refreshSessionWithBackoff(
  request: NextRequest,
  response: NextResponse
): Promise<{ 
  success: boolean;
  user: any | null;
  error: string | null;
  refreshed: boolean;
}> {
  // Generate a request-specific cache key
  const cacheKey = `${request.url}_${Date.now()}`;
  
  // Add detailed debugging
  console.log('[SessionRefresh] Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('[SessionRefresh] Request cookies:', Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.substring(0, 10) + '...'])));
  
  // Get current attempt count or initialize to 0
  const currentAttempt = sessionRefreshAttempts.get(cacheKey) || 0;
  sessionRefreshAttempts.set(cacheKey, currentAttempt + 1);
  
  // If we've exceeded max retries, fail immediately
  if (currentAttempt >= MAX_RETRIES) {
    console.warn(`[Session] Max refresh attempts (${MAX_RETRIES}) exceeded for request`);
    return {
      success: false,
      user: null,
      error: 'Session refresh failed after maximum retries',
      refreshed: false
    };
  }
  
  try {
    // Create Supabase client
    const supabase = createMiddlewareClient(request, response);
    
    // Log before getUser call
    console.log('[SessionRefresh] Calling supabase.auth.getUser()');
    
    // Calculate backoff duration with exponential increase (2^attempt * base)
    const backoffMs = Math.min(
      RETRY_BACKOFF_MS * Math.pow(2, currentAttempt),
      MAX_BACKOFF_MS
    );
    
    // Only apply backoff delay after first attempt
    if (currentAttempt > 0) {
      console.log(`[Session] Retry attempt ${currentAttempt} with ${backoffMs}ms backoff`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    // Try to refresh the session
    const { data, error } = await supabase.auth.getUser();
    
    // Log detailed results
    console.log('[SessionRefresh] Auth result:', { 
      success: !error, 
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message
    });
    
    // Log attempt result
    if (error) {
      console.error(`[Session] Refresh attempt ${currentAttempt + 1} failed:`, error.message);
    } else if (currentAttempt > 0) {
      console.log(`[Session] Successfully refreshed session after ${currentAttempt + 1} attempts`);
    }
    
    // Clear the attempt counter once we're done with this request
    setTimeout(() => {
      sessionRefreshAttempts.delete(cacheKey);
    }, 5000); // Clean up after 5 seconds
    
    return {
      success: !error && !!data.user,
      user: data?.user || null,
      error: error ? error.message : null,
      refreshed: currentAttempt > 0 && !error && !!data.user
    };
  } catch (error: any) {
    console.error('[Session] Unexpected error during session refresh:', error);
    
    // Clean up attempt counter on unexpected error
    sessionRefreshAttempts.delete(cacheKey);
    
    return {
      success: false,
      user: null,
      error: error?.message || 'Unexpected error during session refresh',
      refreshed: false
    };
  }
} 