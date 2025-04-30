"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (hasRedirected) return; // Prevent redirection loops
    
    // Delay the check to allow context to fully initialize
    const redirectionCheck = setTimeout(() => {
      if (!profileLoading) {
        // No profile, redirect to login
        if (!profile) {
          setHasRedirected(true);
          router.push("/sign-in");
          return;
        }

        // Superadmin without selected company - go to company selection
        if (profile.role === UserRole.SUPERADMIN && !selectedCompanyId) {
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
    }, 500); // Short delay to ensure context values are populated

    return () => clearTimeout(redirectionCheck);
  }, [profile, profileLoading, router, selectedCompanyId, hasRedirected]);

  if (profileLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we get here, the user is authenticated and has a valid company context
  return <DashboardContent />;
} 