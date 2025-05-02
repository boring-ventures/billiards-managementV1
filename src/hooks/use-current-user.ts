"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import type { Profile as ProfileType } from "@/types/profile";
import { getLocalStorage, setLocalStorage } from "@/lib/client-utils";
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
        // Get the current user from the auth library
        const currentUser = await getCurrentUser();
        
        // Check if we have a specific user ID in localStorage (for user switching in admin)
        const currentUserId = getLocalStorage('currentUserId');
        
        // Use the localStorage userId if available, otherwise use the one from auth
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
              
              // Store profile in localStorage for fallback
              setLocalStorage('fallbackProfile', JSON.stringify(profileData));
              
              // Reset retry counter on successful fetch
              setApiRetries(0);
            } else {
              console.warn("Profile API returned an error:", response.status);
              
              // If we've tried multiple times and still getting errors, use a fallback
              if (apiRetries >= 2) {
                console.warn("Using fallback profile due to API unavailability");
                
                // Try to load from localStorage first
                const savedFallback = getLocalStorage('fallbackProfile');
                if (savedFallback) {
                  try {
                    const parsed = JSON.parse(savedFallback);
                    setProfile(parsed);
                  } catch (e) {
                    // If parsing fails, use the mock profile
                    const fallbackProfile = createMockProfile(effectiveUserId);
                    setProfile(fallbackProfile);
                    setLocalStorage('fallbackProfile', JSON.stringify(fallbackProfile));
                  }
                } else {
                  // Create and store a new fallback profile
                  const fallbackProfile = createMockProfile(effectiveUserId);
                  setProfile(fallbackProfile);
                  setLocalStorage('fallbackProfile', JSON.stringify(fallbackProfile));
                }
              } else {
                // Increment retry counter
                setApiRetries(prev => prev + 1);
                
                // Try to load from localStorage if available
                const savedFallback = getLocalStorage('fallbackProfile');
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
            // Try to load from localStorage first
            const savedFallback = getLocalStorage('fallbackProfile');
            if (savedFallback) {
              try {
                const parsed = JSON.parse(savedFallback);
                setProfile(parsed);
              } catch (e) {
                const fallbackProfile = createMockProfile(effectiveUserId);
                setProfile(fallbackProfile);
                setLocalStorage('fallbackProfile', JSON.stringify(fallbackProfile));
              }
            } else {
              const fallbackProfile = createMockProfile(effectiveUserId);
              setProfile(fallbackProfile);
              setLocalStorage('fallbackProfile', JSON.stringify(fallbackProfile));
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
