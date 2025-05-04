/**
 * This file re-exports all auth utilities from client and server modules
 * Use the specific client or server modules directly when possible
 * to avoid importing server-only code in client components
 */

// Re-export everything from client utils
export * from './auth-client-utils';

// Re-export server utils with a warning
// These functions should only be used in server components or API routes
export const SERVER_WARNING = 'Server-only functions should not be imported in client components';

// Create a simple type-safe function to check whether code is running on server or client
export const isServer = () => typeof window === 'undefined';

/**
 * Legacy compatibility function - use createServerSupabaseClient from auth-server-utils directly
 * @deprecated Use createServerSupabaseClient from auth-server-utils instead
 */
export function createServerSupabaseClient() {
  if (!isServer()) {
    console.error(SERVER_WARNING);
    throw new Error('Cannot use server-only functions in client components');
  }
  
  // Dynamically import to avoid errors in client components
  const { createServerSupabaseClient: serverCreateServerSupabaseClient } = require('./auth-server-utils');
  return serverCreateServerSupabaseClient();
}

/**
 * Legacy compatibility function - use createMiddlewareClient from auth-server-utils directly
 * @deprecated Use createMiddlewareClient from auth-server-utils instead
 */
export function createMiddlewareClient(request: any, response: any) {
  if (!isServer()) {
    console.error(SERVER_WARNING);
    throw new Error('Cannot use server-only functions in client components');
  }
  
  // Dynamically import to avoid errors in client components
  const { createMiddlewareClient: serverCreateMiddlewareClient } = require('./auth-server-utils');
  return serverCreateMiddlewareClient(request, response);
}

/**
 * Legacy compatibility function - use validateSession from auth-server-utils directly
 * @deprecated Use validateSession from auth-server-utils instead
 */
export async function validateSession() {
  if (!isServer()) {
    console.error(SERVER_WARNING);
    throw new Error('Cannot use server-only functions in client components');
  }
  
  // Dynamically import to avoid errors in client components
  const { validateSession: serverValidateSession } = require('./auth-server-utils');
  return serverValidateSession();
}

/**
 * Legacy compatibility function - use debugServerCookies from auth-server-utils directly
 * @deprecated Use debugServerCookies from auth-server-utils instead
 */
export async function debugServerCookies() {
  if (!isServer()) {
    console.error(SERVER_WARNING);
    return 'Cannot debug server cookies on client';
  }
  
  // Dynamically import to avoid errors in client components
  const { debugServerCookies: serverDebugServerCookies } = require('./auth-server-utils');
  return serverDebugServerCookies();
} 