"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { NewTransactionForm } from "@/components/views/finance/NewTransactionForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Profile as RbacProfile } from "@/types/profile";

export default function NewTransactionPage() {
  const { profile, isLoading } = useCurrentUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Check admin permission when profile changes
    if (profile && !isLoading) {
      hasAdminPermission(profile as RbacProfile | null).then(result => {
        setIsAdmin(result);
        
        // Redirect if not admin
        if (!result) {
          router.push("/dashboard/finance/transactions");
        }
      });
    }
  }, [profile, isLoading, router]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Transaction</h1>
          <p className="text-muted-foreground">
            Create a new financial transaction
          </p>
        </div>
        
        <Button variant="outline" onClick={() => router.push("/dashboard/finance/transactions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
      </div>

      {!isLoading && isAdmin && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-md shadow">
          <NewTransactionForm 
            onSuccess={() => router.push("/dashboard/finance/transactions")} 
          />
        </div>
      )}
    </div>
  );
} 