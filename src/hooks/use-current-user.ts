"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth-client";
import type { Profile as ProfileType } from "@/types/profile";
import { cookieUtils, FALLBACK_PROFILE_COOKIE, USER_ID_COOKIE } from "@/lib/cookie-utils";
import { UserRole } from "@prisma/client";

// Simplified Profile interface for internal use
interface InternalProfile {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  role?: string;
}

// Simple user interface
interface User {
  id: string;
}

// Mock profile for fallback when API is unavailable
const createMockProfile = (userId: string): InternalProfile => ({
  id: "temp-profile-id",
  userId,
  firstName: "User",
  lastName: "Profile",
  companyId: undefined,
  role: UserRole.USER
});

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<InternalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiRetries, setApiRetries] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the current user from the auth-client library
        const currentUser = await getCurrentUser();
        
        // Check if we have a specific user ID in cookies (for user switching in admin)
        const currentUserId = cookieUtils.get(USER_ID_COOKIE);
        
        // Use the cookie userId if available, otherwise use the one from auth
        const effectiveUserId = currentUserId || currentUser?.id;
        
        if (effectiveUserId) {
          // Set the user object
          setUser({ id: effectiveUserId });
          
          try {
            // Use a more direct API path to avoid routing issues with Next.js/Vercel
            const profileEndpoint = '/api/profile';
            const response = await fetch(`${profileEndpoint}?userId=${effectiveUserId}`);
            
            if (response.ok) {
              const data = await response.json();
              // Handle both response formats: data.profile (from by-id format) or data directly
              const profileData = data.profile || data;
              setProfile(profileData);
              
              // Store profile in cookie for fallback
              cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(profileData), {
                expires: 1, // 1 day
                sameSite: 'lax'
              });
              
              // Reset retry counter on successful fetch
              setApiRetries(0);
            } else {
              console.warn("Profile API returned an error:", response.status);
              
              // If we've tried multiple times and still getting errors, use a fallback
              if (apiRetries >= 2) {
                console.warn("Using fallback profile due to API unavailability");
                
                // Try to load from cookie first
                const savedFallback = cookieUtils.get(FALLBACK_PROFILE_COOKIE);
                if (savedFallback) {
                  try {
                    const parsed = JSON.parse(savedFallback);
                    setProfile(parsed);
                  } catch (e) {
                    // If parsing fails, use the mock profile
                    const fallbackProfile = createMockProfile(effectiveUserId);
                    setProfile(fallbackProfile);
                    cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(fallbackProfile), {
                      expires: 1, // 1 day
                      sameSite: 'lax'
                    });
                  }
                } else {
                  // Create and store a new fallback profile
                  const fallbackProfile = createMockProfile(effectiveUserId);
                  setProfile(fallbackProfile);
                  cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(fallbackProfile), {
                    expires: 1, // 1 day
                    sameSite: 'lax'
                  });
                }
              } else {
                // Increment retry counter
                setApiRetries(prev => prev + 1);
                
                // Try to load from cookie if available
                const savedFallback = cookieUtils.get(FALLBACK_PROFILE_COOKIE);
                if (savedFallback) {
                  try {
                    const parsed = JSON.parse(savedFallback);
                    setProfile(parsed);
                  } catch (e) {
                    setProfile(null);
                  }
                } else {
                  setProfile(null);
                }
              }
            }
          } catch (error) {
            console.error("Error fetching profile data:", error);
            // Use fallback on network/fetch errors
            // Try to load from cookie first
            const savedFallback = cookieUtils.get(FALLBACK_PROFILE_COOKIE);
            if (savedFallback) {
              try {
                const parsed = JSON.parse(savedFallback);
                setProfile(parsed);
              } catch (e) {
                const fallbackProfile = createMockProfile(effectiveUserId);
                setProfile(fallbackProfile);
                cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(fallbackProfile), {
                  expires: 1, // 1 day
                  sameSite: 'lax'
                });
              }
            } else {
              const fallbackProfile = createMockProfile(effectiveUserId);
              setProfile(fallbackProfile);
              cookieUtils.set(FALLBACK_PROFILE_COOKIE, JSON.stringify(fallbackProfile), {
                expires: 1, // 1 day
                sameSite: 'lax'
              });
            }
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error in useCurrentUser:", error);
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [apiRetries]);

  return { user, profile, isLoading };
}
