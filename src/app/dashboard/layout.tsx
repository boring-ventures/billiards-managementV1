"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  // This ensures we use our existing dashboard structure
  useEffect(() => {
    if (window.location.pathname === "/dashboard") {
      router.replace("/");
    }
  }, [router]);

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
} 