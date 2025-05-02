"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2 } from "lucide-react";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { UserRole } from "@prisma/client";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useCurrentUser();
  const [ready, setReady] = useState(false);
  
  // Simple check for authentication status
  useEffect(() => {
    if (!isLoading) {
      // User is not authenticated
      if (!user) {
        router.push("/sign-in");
        return;
      }
      
      if (profile) {
        // Check if user is a superadmin
        const isSuperAdmin = 
          profile.role === UserRole.SUPERADMIN || 
          String(profile.role).toUpperCase() === "SUPERADMIN";
          
        // Check if user has a company assigned
        if (!isSuperAdmin && !profile.companyId) {
          router.push("/waiting-approval");
          return;
        }
        
        // Check if user is active
        if (profile.active === false) {
          router.push("/waiting-approval");
          return;
        }
      }
      
      // User is authenticated and has proper access
      setReady(true);
    }
  }, [isLoading, user, profile, router]);

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
            Welcome back, {profile?.firstName || user?.email}
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