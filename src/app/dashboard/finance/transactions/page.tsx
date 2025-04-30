"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionList } from "@/components/views/finance/TransactionList";
import { NewTransactionModal } from "@/components/modals/NewTransactionModal";

export default function FinanceTransactionsPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        )}
      </div>

      {!isLoading && (
        <TransactionList profile={profile} />
      )}

      <NewTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
} 