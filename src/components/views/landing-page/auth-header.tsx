'use client';

import { useAuth } from "@/providers/auth-provider";
import { DashboardButton } from "@/components/dashboard/dashboard-button";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function AuthHeader() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-9 w-[100px] animate-pulse rounded-md bg-muted" />
    );
  }

  if (user) {
    return (
      <DashboardButton 
        href="/dashboard"
        icon={LayoutDashboard}
        title="Dashboard"
        description="Access your account"
        className="w-full md:w-auto"
      />
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/sign-in"
        className="text-primary hover:text-primary-foreground hover:bg-primary px-4 py-2 rounded-md transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/sign-up"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
      >
        Sign Up
      </Link>
    </div>
  );
} 