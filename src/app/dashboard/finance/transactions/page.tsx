"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function FinanceTransactionsPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Transactions</h1>
          <p className="text-muted-foreground">
            Manage income and expenses
          </p>
        </div>
        
        {isAdmin && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Finance features coming soon
        </p>
      </div>
    </div>
  );
} 