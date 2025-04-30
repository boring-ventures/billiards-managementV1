"use client";

import Link from "next/link";
import { InventoryList } from "@/components/views/inventory/InventoryList";
import { hasAdminPermission } from "@/lib/rbac";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function InventoryPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory items, categories, and stock levels
          </p>
        </div>
        {isAdmin && (
          <Link href="/inventory/new" passHref>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Item
            </Button>
          </Link>
        )}
      </div>

      {!isLoading && profile?.companyId && (
        <InventoryList adminView={isAdmin} companyId={profile.companyId} />
      )}
    </div>
  );
} 