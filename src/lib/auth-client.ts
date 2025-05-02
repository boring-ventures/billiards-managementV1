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
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in';
        }
        return null;
      }
    }
    
    if (!data.session?.user) {
      return null;
    }
    
    // Check if we're overriding the user ID for admin view
    let userId = data.session.user.id;
    const overrideUserId = cookieUtils.get(USER_ID_COOKIE);
    if (overrideUserId) {
      userId = overrideUserId;
    }
    
    // Use the profile API to get role and company info
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const profile = data.profile || data;
        
        // Store profile in cookie for fallback
        cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(profile), {
          expires: 1, // 1 day
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        
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
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
    
    // Try to load from cookie fallback
    try {
      const fallbackJson = cookieUtils.get(FALLBACK_PROFILE_COOKIE);
      if (fallbackJson) {
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
      sameSite: 'lax'
    });
  } else {
    cookieUtils.remove(USER_ID_COOKIE);
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
 * Client-side sign out
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    // Clear any cookies we might have set
    cookieUtils.clearAuthCookies();
  } catch (error) {
    console.error('Error signing out:', error);
  }
} 