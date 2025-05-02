"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { NewTableForm } from "@/components/views/tables/NewTableForm";
import { ArrowLeft } from "lucide-react";
import type { Profile as RbacProfile } from "@/types/profile";
import { useRouter } from "next/navigation";

export default function NewTablePage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile as RbacProfile | null);
  
  if (!profile?.companyId || !hasAdminPermission(profile as RbacProfile | null)) {
    return (
      <div className="container mx-auto py-6">
        <p>You do not have permission to access this page.</p>
        <Link href="/dashboard/tables">
          <Button variant="outline" className="mt-4">
            Go Back
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Table</h1>
          <p className="text-muted-foreground">
            Create a new pool table for your venue
          </p>
        </div>
        
        <Link href="/dashboard/tables" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tables
          </Button>
        </Link>
      </div>
      
      <NewTableForm />
    </div>
  );
} 