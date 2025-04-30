'use client';

import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  description,
  actions,
}: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { profile } = useCurrentUser();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-border/60 pb-6 mb-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
} 