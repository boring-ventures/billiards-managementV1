"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { User, Session } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types/profile";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Fetch profile function
  const fetchProfile = async (userId: string) => {
    try {
      // First try direct profile fetch
      const response = await fetch(`/api/profile/${userId}`);
      
      if (!response.ok) {
        console.error(`Profile fetch failed with status: ${response.status}`);
        
        // Try to get detailed error if possible
        try {
          const errorData = await response.json();
          console.error("Profile error details:", errorData);
        } catch (parseError) {
          console.error("Could not parse error response");
        }
        
        // Try regular profile endpoint as fallback
        console.log("Trying fallback profile fetch");
        const fallbackResponse = await fetch('/api/profile');
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setProfile(fallbackData);
          return;
        }
        
        throw new Error("Failed to fetch profile");
      }
      
      const data = await response.json();
      setProfile(data.profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setIsLoading(false);

      if (event === "SIGNED_OUT") {
        router.push("/sign-in");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    router.push("/dashboard");
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      // First try the API endpoint
      const response = await fetch("/api/auth/signout", { method: "POST" });
      
      if (!response.ok) {
        // If API fails, fall back to client-side signout
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      
      // Clear state regardless of method used
      setUser(null);
      setSession(null);
      setProfile(null);
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      // Clear state on error to prevent being stuck
      setUser(null);
      setSession(null);
      setProfile(null);
      router.push("/sign-in");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 