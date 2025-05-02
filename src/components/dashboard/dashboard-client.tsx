"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2 } from "lucide-react";
import { UserRole } from "@prisma/client";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { createSupabaseClient } from "@/lib/supabase/client";

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

  // Get Supabase instance early on mount
  useEffect(() => {
    createSupabaseClient();
  }, []);
  
  // First, very quick check for authentication
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createSupabaseClient();
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
  
  // Once auth check completes, perform detailed permission check
  useEffect(() => {
    // Only run when initial loading is complete and not yet checked
    if (isLoadingAuth || initialChecked || isLoading) return;
    
    setInitialChecked(true);
    
    // If user is not authenticated, redirect to sign-in
    if (!user) {
      router.push("/sign-in");
      return;
    }
    
    // If user is authenticated but needs routing check
    if (user && profile) {
      // Check if user is a superadmin
      const isSuperAdmin = 
        profile.role === UserRole.SUPERADMIN || 
        String(profile.role).toUpperCase() === "SUPERADMIN";
      
      // ADMIN route protection
      const isAdminRoute = window.location.pathname.startsWith("/dashboard/admin");
      if (isAdminRoute && !isSuperAdmin) {
        router.push("/dashboard");
        return;
      }
      
      // Check if user has a company assigned
      if (!isSuperAdmin && !profile.companyId) {
        router.push("/waiting-approval");
        return;
      }
      
      // Check if user is inactive
      const isInactive = 
        (profile as any).active === false || 
        (profile as any).active === 'false';
        
      if (isInactive) {
        router.push("/waiting-approval");
        return;
      }
      
      // SUPERADMIN without company should go to company selection
      if (isSuperAdmin && !profile.companyId && window.location.pathname !== "/company-selection") {
        router.push("/company-selection");
        return;
      }
      
      // User is authenticated and has proper access
      setReady(true);
    }
  }, [isLoadingAuth, isLoading, user, profile, router, initialChecked]);
  
  // Show loading state
  if (isLoadingAuth || isLoading || !ready) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Simplified dashboard header with lazy-loaded content
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.firstName || (user ? user.id : 'User')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30">
            Active
          </span>
        </div>
      </div>
      
      {/* DashboardContent shows appropriate content based on role and company */}
      <DashboardContent />
    </div>
  );
} 