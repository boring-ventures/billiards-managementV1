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

/**
 * Client-side version of getCurrentUser that doesn't use Prisma
 * This fetches the profile from the profile API instead
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get current session from Supabase
    const { data, error } = await supabase.auth.getSession();
    
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
    
    // Use the profile API to get role and company info
    try {
      // Always include auth token in headers to help with server-side auth
      const accessToken = data.session.access_token;
      
      // Add debug information to help diagnose issues
      console.log(`Calling profile API endpoint: /api/profile?userId=${userId}`);
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`,
        'X-Client-Info': 'auth-client/2.0'
      };
      
      // Use a more direct API path to avoid routing issues
      const response = await fetch(`/api/profile?userId=${userId}`, { headers });
      
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
          
          const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error("Failed to refresh session:", refreshError);
            await signOut();
            return null;
          }
          
          if (refreshedData?.session) {
            console.log("Session refreshed successfully, retrying profile fetch");
            
            // Retry the profile fetch with the new token
            const retryResponse = await fetch(`/api/profile?userId=${userId}`, {
              headers: {
                'Authorization': `Bearer ${refreshedData.session.access_token}`,
                'X-Client-Info': 'auth-client/2.0'
              }
            });
            
            console.log(`Retry profile fetch status: ${retryResponse.status}`);
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const retryProfile = retryData.profile || retryData;
              
              // Store profile in cookie for fallback
              cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(retryProfile), {
                expires: 1, // 1 day
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
              });
              
              console.log("Profile fetched successfully after refresh");
              
              return {
                id: userId,
                email: refreshedData.session?.user.email,
                name: retryProfile.firstName 
                  ? `${retryProfile.firstName} ${retryProfile.lastName || ''}` 
                  : refreshedData.session?.user.user_metadata?.name,
                role: retryProfile.role || refreshedData.session?.user.user_metadata?.role || UserRole.USER,
                companyId: retryProfile.companyId
              };
            } else {
              console.error("Profile retry failed with status:", retryResponse.status);
              
              // Try to get more error details from the retry response
              try {
                const retryErrorData = await retryResponse.json();
                console.error("Retry error details:", retryErrorData);
              } catch (e) {
                console.error("Could not parse retry error response");
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
    
    console.log("Trying fallback profile fetch");
    
    // Try to load from cookie fallback
    try {
      const fallbackJson = cookieUtils.get(FALLBACK_PROFILE_COOKIE);
      if (fallbackJson) {
        console.log("Using fallback profile from cookie");
        const fallbackProfile = JSON.parse(fallbackJson);
        return {
          id: userId,
          email: data.session.user.email || undefined,
          name: fallbackProfile.firstName 
            ? `${fallbackProfile.firstName} ${fallbackProfile.lastName || ''}` 
            : data.session.user.user_metadata?.name,
          role: fallbackProfile.role || data.session.user.user_metadata?.role || UserRole.USER,
          companyId: fallbackProfile.companyId
        };
      }
    } catch (e) {
      console.error("Error parsing fallback profile:", e);
    }
    
    console.log("Using basic session data as fallback");
    
    // Fallback to just the session data without profile info
    return {
      id: userId,
      email: data.session.user.email || undefined,
      name: data.session.user.user_metadata?.name,
      role: data.session.user.user_metadata?.role || UserRole.USER
    };
  } catch (error) {
    console.error("Error in client-side getCurrentUser:", error);
    return null;
  }
}

/**
 * Sets the current user ID for admin view switching
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
    cookieUtils.remove(USER_ID_COOKIE, { path: '/' });
  }
}

/**
 * Client-side check if user is logged in
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error.message);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error('IsLoggedIn error:', error);
    return false;
  }
}

/**
 * Attempt to refresh the session
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh error:', error.message);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error('RefreshSession error:', error);
    return false;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    
    // Clear all auth-related cookies
    cookieUtils.clearAuthCookies();
    
    // Force reload the page to reset all client state
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  } catch (error) {
    console.error('SignOut error:', error);
    
    // Try to clear cookies even if sign out failed
    cookieUtils.clearAuthCookies();
    
    // Force reload as a fallback
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  }
} 