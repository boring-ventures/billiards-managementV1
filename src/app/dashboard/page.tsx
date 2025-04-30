"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/context/company-context";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Import the original dashboard content
  const router = useRouter();
  const { profile } = useCurrentUser();
  const { selectedCompanyId } = useCompany();

  useEffect(() => {
    // We want to ensure we're rendering the same content
    if (typeof window !== "undefined") {
      router.replace("/dashboard");
    }
  }, [router]);

  // Show loading or redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading dashboard...</p>
    </div>
  );
} 