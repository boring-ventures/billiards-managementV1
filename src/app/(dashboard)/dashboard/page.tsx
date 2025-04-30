"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/context/company-context";
import { UserRole } from "@prisma/client";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useCurrentUser();
  const { selectedCompanyId } = useCompany();
  const [hasRedirected, setHasRedirected] = useState(false);
  const redirectionTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hasRedirected) return; // Prevent redirection loops
    
    // Clear any existing redirection timeouts
    if (redirectionTimeout.current) {
      clearTimeout(redirectionTimeout.current);
    }
    
    // Delay the check to allow context to fully initialize
    redirectionTimeout.current = setTimeout(() => {
      if (!profileLoading) {
        // No profile, redirect to login
        if (!profile) {
          setHasRedirected(true);
          router.push("/sign-in");
          return;
        }

        // Only redirect superadmin if they definitely have no company selected
        // This prevents a loop where the context is still loading the company from localStorage
        if (profile.role === UserRole.SUPERADMIN && 
            !selectedCompanyId && 
            typeof window !== 'undefined' && 
            !localStorage.getItem("selectedCompanyId")) {
          
          console.log("No company selected, redirecting to company selection");
          setHasRedirected(true);
          router.push("/company-selection");
          return;
        }

        // Regular user without a company - go to waiting page
        if (profile.role !== UserRole.SUPERADMIN && !profile.companyId) {
          setHasRedirected(true);
          router.push("/waiting-approval");
          return;
        }
      }
    }, 1500); // Longer delay to ensure context values are populated

    return () => {
      if (redirectionTimeout.current) {
        clearTimeout(redirectionTimeout.current);
      }
    };
  }, [profile, profileLoading, router, selectedCompanyId, hasRedirected]);

  if (profileLoading || (profile?.role === UserRole.SUPERADMIN && !selectedCompanyId && !hasRedirected)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we get here, the user is authenticated and has a valid company context
  return <DashboardContent />;
} 