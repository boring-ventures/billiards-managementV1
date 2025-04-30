"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";

export default function SettingsPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Settings features coming soon
        </p>
      </div>
    </div>
  );
} 