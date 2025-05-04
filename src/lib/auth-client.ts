'use client';

import { supabase } from '@/lib/supabase/client';
import { UserRole } from '@prisma/client';
import { cookieUtils, FALLBACK_PROFILE_COOKIE, USER_ID_COOKIE } from './cookie-utils';

// Types (mimicking the server-side auth.ts)
export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  companyId?: string;
}

export interface Session {
  user: User;
  expires: Date;
}

// Authentication state tracking
let authInitialized = false;
let isAuthenticating = false;

/**
 * Get the current session with additional error handling
 */
export async function getAuthSession() {
  try {
    // If we're already in the process of authenticating, wait a bit to avoid race conditions
    if (isAuthenticating) {
      console.log('Authentication in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const { data, error } = await supabase().auth.getSession();
    if (error) {
      console.error('Session error in getAuthSession:', error.message);
      return null;
    }
    return data.session;
  } catch (e) {
    console.error('Error in getAuthSession:', e);
    return null;
  }
}

/**
 * Helper function to ensure all API requests include auth token
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    // Wait for authentication to complete if it's in progress
    if (isAuthenticating) {
      console.log('Authentication in progress, waiting before fetching...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // If auth isn't initialized yet, try to get the session first
    if (!authInitialized) {
      await getAuthSession();
      authInitialized = true;
    }
    
    // Get the current session for the auth token
    const session = await getAuthSession();
    
    // Prepare headers
    const headers = new Headers(options.headers || {});
    
    if (session?.access_token) {
      // Add the access token as a bearer token
      headers.set('Authorization', `Bearer ${session.access_token}`);
      console.log('Added auth token to request');
    } else {
      console.warn('No access token available for API request');
    }
    
    // Add client info
    headers.set('X-Client-Info', 'auth-client/2.0');
    
    // Execute the fetch with the updated headers
    return fetch(url, {
      ...options,
      headers
    });
  } catch (e) {
    console.error('Error in fetchWithAuth:', e);
    throw e;
  }
}

/**
 * Sign in with email and password
 * This wraps the Supabase auth to ensure proper session handling
 */
export async function signInWithPassword(email: string, password: string) {
  try {
    isAuthenticating = true;
    console.log('Starting authentication process...');
    
    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Sign in error:', error.message);
      isAuthenticating = false;
      throw error;
    }
    
    // Ensure session is fully established before continuing
    if (data.session) {
      // Store the session token in cookie for future requests
      cookieUtils.set('sb-auth-token', data.session.access_token, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      console.log('Authentication successful, session established');
      
      // Wait a moment to ensure cookies are properly set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force a session refresh to ensure tokens are properly synchronized
      await supabase().auth.getUser();
      
      authInitialized = true;
    }
    
    isAuthenticating = false;
    return data;
  } catch (e) {
    isAuthenticating = false;
    throw e;
  }
}

/**
 * Client-side version of getCurrentUser that doesn't use Prisma
 * This fetches the profile from the profile API instead
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // If authentication is in progress, wait for it to complete
    if (isAuthenticating) {
      console.log('Authentication in progress, waiting before getting user...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Get current session from Supabase
    const { data, error } = await supabase().auth.getSession();
    
    if (error) {
      console.error('Session error:', error.message);
      
      // If there's a refresh token error, try to handle it by signing out and redirecting
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('Token expired') ||
          error.message.includes('JWT expired')) {
        await signOut();
        return null;
      }
    }
    
    if (!data.session?.user) {
      console.log('No active session found');
      return null;
    }
    
    // Check if we're overriding the user ID for admin view
    let userId = data.session.user.id;
    const overrideUserId = cookieUtils.get(USER_ID_COOKIE);
    if (overrideUserId) {
      console.log(`Using override userId: ${overrideUserId}`);
      userId = overrideUserId;
    }
    
    // Log authentication state
    console.log(`Fetching profile for user: ${userId}`);
    
    // Use our fetchWithAuth helper to ensure auth token is included
    try {
      console.log(`Calling profile API endpoint: /api/profile?userId=${userId}`);
      
      // Use fetchWithAuth to ensure auth headers are included
      const response = await fetchWithAuth(`/api/profile?userId=${userId}`);
      
      // Log the response status to help diagnose issues
      console.log(`Profile API response status: ${response.status}`);
      
      if (response.ok) {
        const responseData = await response.json();
        // Handle both response formats: data.profile (from by-id format) or data directly
        const profile = responseData.profile || responseData;
        
        // Store profile in cookie for fallback
        cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(profile), {
          expires: 1, // 1 day
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        });
        
        console.log(`Profile fetched successfully for user: ${userId}`);
        
        // Return user with combined data
        return {
          id: userId,
          email: data.session?.user.email,
          name: profile.firstName 
            ? `${profile.firstName} ${profile.lastName || ''}` 
            : data.session?.user.user_metadata?.name,
          role: profile.role || data.session?.user.user_metadata?.role || UserRole.USER,
          companyId: profile.companyId
        };
      } else {
        console.error("Profile fetch failed with status:", response.status);
        
        // Try to get more error details from the response
        try {
          const errorData = await response.json();
          console.error("Profile error details:", errorData);
        } catch (e) {
          console.error("Could not parse error response");
        }
        
        // If we get a 401, try to refresh the session and retry once
        if (response.status === 401) {
          console.log("Attempting to refresh session and retry profile fetch");
          
          const { data: refreshedData, error: refreshError } = await supabase().auth.refreshSession();
          
          if (refreshError) {
            console.error("Failed to refresh session:", refreshError);
            await signOut();
            return null;
          }
          
          if (refreshedData?.session) {
            console.log("Session refreshed successfully, retrying profile fetch");
            
            // Retry the fetch with the new token using fetchWithAuth
            const retryResponse = await fetchWithAuth(`/api/profile?userId=${userId}`);
            
            console.log(`Retry profile fetch status: ${retryResponse.status}`);
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const retryProfile = retryData.profile || retryData;
              
              return {
                id: userId,
                email: refreshedData.session?.user.email,
                name: retryProfile.firstName 
                  ? `${retryProfile.firstName} ${retryProfile.lastName || ''}` 
                  : refreshedData.session?.user.user_metadata?.name,
                role: retryProfile.role || refreshedData.session?.user.user_metadata?.role || UserRole.USER,
                companyId: retryProfile.companyId
              };
            }
          }
        }
        
        // Try to use fallback profile from cookie if API fails
        const fallbackProfileJson = cookieUtils.get(FALLBACK_PROFILE_COOKIE);
        if (fallbackProfileJson) {
          try {
            const fallbackProfile = JSON.parse(fallbackProfileJson);
            console.log("Using fallback profile from cookie");
            
            return {
              id: userId,
              email: data.session?.user.email,
              name: fallbackProfile.firstName 
                ? `${fallbackProfile.firstName} ${fallbackProfile.lastName || ''}` 
                : data.session?.user.user_metadata?.name,
              role: fallbackProfile.role || data.session?.user.user_metadata?.role || UserRole.USER,
              companyId: fallbackProfile.companyId
            };
          } catch (e) {
            console.error("Failed to parse fallback profile:", e);
          }
        }
        
        return {
          id: userId,
          email: data.session?.user.email,
          name: data.session?.user.user_metadata?.name,
          role: data.session?.user.user_metadata?.role || UserRole.USER,
          companyId: data.session?.user.user_metadata?.companyId
        };
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
      
      // Fallback to basic user object from session
      return {
        id: userId,
        email: data.session?.user.email,
        name: data.session?.user.user_metadata?.name,
        role: data.session?.user.user_metadata?.role || UserRole.USER,
        companyId: data.session?.user.user_metadata?.companyId
      };
    }
  } catch (e) {
    console.error("Error in getCurrentUser:", e);
    return null;
  }
}

/**
 * Set the current user ID (for admin view as another user)
 */
export function setCurrentUserId(userId: string | null): void {
  if (userId) {
    cookieUtils.set(USER_ID_COOKIE, userId, {
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  } else {
    cookieUtils.remove(USER_ID_COOKIE);
  }
}

/**
 * Check if the user is currently logged in
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const { data, error } = await supabase().auth.getSession();
    
    if (error) {
      console.error('Error checking login status:', error.message);
      return false;
    }
    
    return !!data.session;
  } catch (e) {
    console.error('Exception in isLoggedIn:', e);
    return false;
  }
}

/**
 * Force refresh the auth session
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase().auth.refreshSession();
    
    if (error) {
      console.error('Failed to refresh session:', error.message);
      return false;
    }
    
    return !!data.session;
  } catch (e) {
    console.error('Exception in refreshSession:', e);
    return false;
  }
}

/**
 * Sign out from Supabase and clear local state
 */
export async function signOut(): Promise<void> {
  try {
    // Clear any override user cookie
    setCurrentUserId(null);
    
    // Clear profile cookie
    cookieUtils.remove(FALLBACK_PROFILE_COOKIE);
    
    // Sign out from Supabase
    await supabase().auth.signOut({ scope: 'local' });
    
    console.log('Successfully signed out');
    
    // Reset our tracking
    authInitialized = false;
  } catch (e) {
    console.error('Error during sign out:', e);
    throw e;
  }
} 