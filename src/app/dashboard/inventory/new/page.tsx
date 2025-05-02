"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import InventoryForm from "@/components/views/inventory/InventoryForm";
import { Loader2 } from "lucide-react";
import type { Profile as RbacProfile } from "@/types/profile";

export default function NewInventoryItemPage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();

  // Check if user has admin permissions
  useEffect(() => {
    if (!isLoading && !hasAdminPermission(profile as RbacProfile | null)) {
      router.push("/dashboard");
    }
  }, [profile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only render form if user has admin access and there's a company context
  if (!profile?.companyId || !hasAdminPermission(profile as RbacProfile | null)) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Inventory Item</h1>
        <p className="text-muted-foreground">
          Create a new inventory item for your company
        </p>
      </div>

      <InventoryForm companyId={profile.companyId} />
    </div>
  );
} 