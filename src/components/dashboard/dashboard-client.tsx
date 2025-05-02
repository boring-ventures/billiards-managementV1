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
  
  // First, very quick check for authentication
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        // No session, redirect immediately
        if (!data.session) {
          router.push("/sign-in");
        }
        
        setIsLoadingAuth(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoadingAuth(false);
      }
    };
    
    checkSession();
  }, [router]);
  
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