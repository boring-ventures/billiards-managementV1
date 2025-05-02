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

  useEffect(() => {
    // Create a client-specific instance with a shared key
    // This ensures we don't have duplicate instances
    createSupabaseClient();
  }, []);
  
  // Handle authentication check
  useEffect(() => {
    // Skip if already checked or still loading
    if (initialChecked || isLoading) return;
    
    // Set initial check complete
    setInitialChecked(true);
    
    // If user is not authenticated, redirect to sign-in
    if (!isLoading && !user) {
      router.push("/sign-in");
      return;
    }
    
    // If user is authenticated but needs routing check
    if (!isLoading && user && profile) {
      // Check if user is a superadmin
      const isSuperAdmin = 
        profile.role === UserRole.SUPERADMIN || 
        String(profile.role).toUpperCase() === "SUPERADMIN";
      
      // Check if user has a company assigned
      if (!isSuperAdmin && !profile.companyId) {
        router.push("/waiting-approval");
        return;
      }
      
      // Check if user is inactive based on a property in the profile object
      // We avoid direct property access to avoid TypeScript errors
      const isInactive = 
        (profile as any).active === false || 
        (profile as any).active === 'false';
        
      if (isInactive) {
        router.push("/waiting-approval");
        return;
      }
      
      // User is authenticated and has proper access
      setReady(true);
    }
  }, [isLoading, user, profile, router, initialChecked]);
  
  // Add a fallback detection in case the hook doesn't fire
  useEffect(() => {
    // Secondary check to ensure user loading completes
    const timeout = setTimeout(() => {
      if (!user && !isLoading) {
        router.push("/sign-in");
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [user, isLoading, router]);

  // Loading state
  if (isLoading || !ready) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      
      {/* Wrap content in error boundary and suspense for more resilient loading */}
      <DashboardContent />
    </div>
  );
} 