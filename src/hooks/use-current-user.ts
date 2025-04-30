"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { type User } from "@supabase/auth-helpers-nextjs";
import { Profile } from "@prisma/client";

type CurrentUserData = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refetch?: () => Promise<void>;
};

export function useCurrentUser(): CurrentUserData {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(session.user);

      // Fetch the user's profile from our API
      const response = await fetch("/api/profile");

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const profileData = await response.json();
      
      // Ensure companyId is set correctly from company_id
      if (profileData.company_id && !profileData.companyId) {
        profileData.companyId = profileData.company_id;
      }
      
      setProfile(profileData);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session) {
            setUser(session.user);

            // Fetch the user's profile when auth state changes
            try {
              const response = await fetch("/api/profile");
              if (response.ok) {
                const profileData = await response.json();
                
                // Ensure companyId is set correctly from company_id
                if (profileData.company_id && !profileData.companyId) {
                  profileData.companyId = profileData.company_id;
                }
                
                setProfile(profileData);
              }
            } catch (err) {
              console.error("Error fetching profile:", err);
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return { user, profile, isLoading, error, refetch: fetchUserData };
}
