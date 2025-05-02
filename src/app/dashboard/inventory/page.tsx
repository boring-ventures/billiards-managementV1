"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InventoryList } from "@/components/views/inventory/InventoryList";
import { hasAdminPermission } from "@/lib/rbac";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useViewMode } from "@/context/view-mode-context";
import { UserRole } from "@prisma/client";

export default function InventoryPage() {
  const { profile, isLoading } = useCurrentUser();
  const { viewMode } = useViewMode();
  const isAdmin = hasAdminPermission(profile, viewMode);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(null);

  // Determine the effective company ID (from profile or localStorage for superadmins)
  useEffect(() => {
    if (!profile) return;

    let companyId = profile.companyId;
    
    // For superadmins, check localStorage
    if (profile.role === UserRole.SUPERADMIN && typeof window !== 'undefined') {
      const selectedCompanyId = localStorage.getItem('selectedCompanyId');
      if (selectedCompanyId) {
        companyId = selectedCompanyId;
      }
    }
    
    setEffectiveCompanyId(companyId);
  }, [profile]);

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
          <Link href="/dashboard/inventory/new" passHref>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Item
            </Button>
          </Link>
        )}
      </div>

      {!isLoading && (
        // Pass the effectiveCompanyId only if it's not null
        <InventoryList adminView={isAdmin} companyId={effectiveCompanyId || ""} />
      )}
    </div>
  );
} 