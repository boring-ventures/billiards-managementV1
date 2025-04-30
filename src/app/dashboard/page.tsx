"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2 } from "lucide-react";
import DashboardContent from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Debug logging
      console.log("Dashboard - Current user state:", { 
        user: user ? { id: user.id, email: user.email } : null,
        profile: profile ? { 
          id: profile.id, 
          companyId: profile.companyId, 
          role: profile.role,
          active: profile.active
        } : null
      });
    
      // Redirect if not authenticated
      if (!user) {
        console.log("Dashboard - No user, redirecting to sign-in");
        router.push("/sign-in");
        return;
      }

      // Redirect if no company selected
      if (!profile?.companyId) {
        console.log("Dashboard - No companyId in profile, redirecting to company-selection");
        router.push("/company-selection");
        return;
      }

      // Redirect if waiting for approval
      if (!profile.active) {
        console.log("Dashboard - User not active, redirecting to waiting-approval");
        router.push("/waiting-approval");
        return;
      }

      setLoading(false);
    }
  }, [user, profile, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.firstName || user?.email}
        </p>
      </div>
      
      <DashboardContent />
    </div>
  );
} 