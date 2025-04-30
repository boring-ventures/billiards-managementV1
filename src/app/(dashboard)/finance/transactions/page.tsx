"use client";

import Link from "next/link";
import { TransactionsList } from "@/components/views/finance/TransactionsList";
import { hasAdminPermission } from "@/lib/rbac";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function FinanceTransactionsPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);

  // Redirect non-admin users
  if (!isLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access the finance module.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Management</h1>
          <p className="text-muted-foreground">
            Track and manage all financial transactions for your business
          </p>
        </div>
        {isAdmin && (
          <Button id="new-transaction-btn">
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        )}
      </div>

      {!isLoading && profile?.companyId && (
        <TransactionsList companyId={profile.companyId} />
      )}
    </div>
  );
} 