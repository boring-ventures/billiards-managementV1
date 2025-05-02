"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import type { Profile as ProfileType } from "@/types/profile";
import { getLocalStorage } from "@/lib/client-utils";

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

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<InternalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          
          // Fetch the user's profile
          const response = await fetch(`/api/profile/by-id?userId=${effectiveUserId}`);
          
          if (response.ok) {
            const data = await response.json();
            setProfile(data.profile);
          } else {
            console.error("Error fetching profile:", response.statusText);
            setProfile(null);
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
  }, []);

  return { user, profile, isLoading };
}
