"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2 } from "lucide-react";
import { UserRole } from "@prisma/client";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { supabase } from "@/lib/supabase/client";

// Type interfaces to match useCurrentUser
interface InternalProfile {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  role?: string;
  // Add missing properties that might be used
  active?: boolean | string;
}

export default function DashboardClient() {
  const router = useRouter();
  const { user, profile, isLoading } = useCurrentUser();
  const [ready, setReady] = useState(false);
  const [initialChecked, setInitialChecked] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState(0);
  
  // First, very quick check for authentication
  useEffect(() => {
    const checkSession = async () => {
      try {
        // If we've already checked multiple times and still have issues, 
        // we might need to redirect
        if (sessionCheckAttempts > 3) {
          console.error("Multiple session check attempts failed, redirecting to sign-in");
          router.push("/sign-in");
          return;
        }
        
        // Ensure we have a valid client before calling getSession
        const client = supabase();
        
        // Check if client has auth property before calling getSession
        if (!client || !client.auth) {
          console.error("Supabase client or auth is not available");
          setSessionCheckAttempts(prev => prev + 1);
          
          // Don't redirect immediately, wait a moment and retry
          setTimeout(() => {
            setIsLoadingAuth(false);
            setIsLoadingAuth(true); // Trigger effect again
          }, 1000);
          return;
        }
        
        const { data, error } = await client.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setSessionCheckAttempts(prev => prev + 1);
          
          // Retry after a delay instead of redirecting immediately
          if (sessionCheckAttempts < 3) {
            setTimeout(() => {
              setIsLoadingAuth(false);
              setIsLoadingAuth(true); // Trigger effect again
            }, 1000);
            return;
          }
          
          router.push("/sign-in");
          return;
        }
        
        // No session, redirect after multiple attempts
        if (!data || !data.session) {
          console.log("No active session found, redirecting to sign-in");
          setSessionCheckAttempts(prev => prev + 1);
          
          // Retry a couple of times before redirecting
          if (sessionCheckAttempts < 3) {
            setTimeout(() => {
              setIsLoadingAuth(false);
              setIsLoadingAuth(true); // Trigger effect again
            }, 1000);
            return;
          }
          
          router.push("/sign-in");
          return;
        }
        
        // Session found, continue to dashboard
        setIsLoadingAuth(false);
        setSessionCheckAttempts(0); // Reset counter if successful
      } catch (error) {
        console.error("Auth check error:", error);
        setSessionCheckAttempts(prev => prev + 1);
        
        // Retry a couple times
        if (sessionCheckAttempts < 3) {
          setTimeout(() => {
            setIsLoadingAuth(false);
            setIsLoadingAuth(true); // Trigger effect again
          }, 1000);
          return;
        }
        
        setIsLoadingAuth(false);
        router.push("/sign-in");
      }
    };
    
    if (isLoadingAuth) {
      checkSession();
    }
  }, [router, isLoadingAuth, sessionCheckAttempts]);
  
  // Ensure we've verified the user and loaded profile before showing content
  useEffect(() => {
    // Only set ready when the auth check is complete AND the user is loaded
    if (!isLoadingAuth && !isLoading) {
      // If user wasn't found, we should redirect (this is a backup to the first check)
      if (!user) {
        router.push("/sign-in");
        return;
      }
      
      // If profile has a company ID and user is not on the company selection page
      // and current path is not admin path, redirect to dashboard for that company
      if (profile?.companyId && typeof window !== 'undefined') {
        // Now we're satisfied - show the dashboard
        setReady(true);
      } else if (!profile?.companyId && typeof window !== 'undefined') {
        // Check if this is the super admin
        if (profile?.role === UserRole.SUPERADMIN) {
          setReady(true);
        } else {
          // The user doesn't have a company, redirect to the selection page
          // Unless they're already there
          if (!window.location.pathname.includes("/company-selection") &&
              !window.location.pathname.includes("/waiting-approval")) {
            router.push("/company-selection");
          }
        }
      }
    }
  }, [user, profile, isLoading, isLoadingAuth, router]);
  
  // Show loading state
  if (isLoadingAuth || !ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  
  // Show dashboard content
  return <DashboardContent />;
} 