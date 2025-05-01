"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, BarChart3, Calendar } from "lucide-react";
import { TableList } from "@/components/views/tables/TableList";
import { hasAdminPermission } from "@/lib/rbac";
import { useCurrentUser } from "@/hooks/use-current-user";
import { TableSearch } from "@/components/ui/table-search";
import { TableStatusFilter } from "@/components/ui/table-status-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TablesPage() {
  const { profile, isLoading } = useCurrentUser();
  const isAdmin = hasAdminPermission(profile);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tables</h1>
          <p className="text-muted-foreground">
            Manage your tables and track active sessions
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          {isAdmin && (
            <Link href="/dashboard/tables/new" passHref>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Table
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tables">
            <BarChart3 className="mr-2 h-4 w-4" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Calendar className="mr-2 h-4 w-4" />
            Maintenance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tables" className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <TableSearch onSearch={setSearchQuery} placeholder="Search tables..." />
            <TableStatusFilter onStatusChange={setStatusFilter} currentStatus={statusFilter} />
          </div>
          
          {!isLoading && (
            <TableList 
              profile={profile} 
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              refreshKey={refreshKey}
            />
          )}
        </TabsContent>
        
        <TabsContent value="maintenance" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Scheduled Maintenance</h2>
          </div>
          
          {!isLoading && profile?.companyId && (
            <div>
              {/* We'll need to create a MaintenanceList component later */}
              <p className="text-muted-foreground">Maintenance records will be displayed here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 