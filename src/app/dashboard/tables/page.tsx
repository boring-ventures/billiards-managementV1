"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PermissionButton } from "@/components/ui/permission-button";
import { Plus, RefreshCw, BarChart3, BookmarkIcon } from "lucide-react";
import { TableList } from "@/components/views/tables/TableList";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Profile } from "@/hooks/use-auth";
import { TableSearch } from "@/components/ui/table-search";
import { TableStatusFilter } from "@/components/ui/table-status-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationList } from "@/components/views/tables/ReservationList";
import { useViewMode } from "@/context/view-mode-context";
import { Profile as PrismaProfile } from "@prisma/client";

export default function TablesPage() {
  const { profile, isLoading } = useCurrentUser();
  const { viewMode } = useViewMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Cast the profile to the appropriate types for each component
  const authProfile = profile as unknown as Profile | null;
  const prismaProfile = profile as unknown as PrismaProfile | null;
  
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
          
          <PermissionButton 
            sectionKey="tables" 
            action="create"
            asChild
          >
            <Link href="/dashboard/tables/new">
              <Plus className="mr-2 h-4 w-4" />
              New Table
            </Link>
          </PermissionButton>
        </div>
      </div>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tables">
            <BarChart3 className="mr-2 h-4 w-4" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="reservations">
            <BookmarkIcon className="mr-2 h-4 w-4" />
            Reservations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tables" className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <TableSearch onSearch={setSearchQuery} placeholder="Search tables..." />
            <TableStatusFilter onStatusChange={setStatusFilter} currentStatus={statusFilter} />
          </div>
          
          {!isLoading && (
            <TableList 
              profile={authProfile} 
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              refreshKey={refreshKey}
            />
          )}
        </TabsContent>
        
        <TabsContent value="reservations" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Table Reservations</h2>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          {!isLoading && profile?.companyId && (
            <ReservationList 
              profile={prismaProfile}
              refreshKey={refreshKey}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 