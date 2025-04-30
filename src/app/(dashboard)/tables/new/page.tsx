"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { NewTableForm } from "@/components/views/tables/NewTableForm";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";

export default function NewTablePage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  
  // Check if user has admin permissions
  useEffect(() => {
    if (!isLoading && !hasAdminPermission(profile)) {
      router.push("/tables");
    }
  }, [isLoading, profile, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Table</h1>
          <p className="text-muted-foreground">
            Create a new table for your venue
          </p>
        </div>
        
        <Link href="/tables" passHref>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Tables
          </Button>
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <NewTableForm />
      </div>
    </div>
  );
} 