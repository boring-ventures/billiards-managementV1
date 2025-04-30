"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TableList } from "@/components/views/tables/TableList";
import { hasAdminPermission } from "@/lib/rbac";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function TablesPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tables</h1>
          <p className="text-muted-foreground">
            Manage your tables and track active sessions
          </p>
        </div>
        
        {isAdmin && (
          <Link href="/dashboard/tables/new" passHref>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Table
            </Button>
          </Link>
        )}
      </div>

      {!isLoading && (
        <TableList profile={profile} />
      )}
    </div>
  );
} 