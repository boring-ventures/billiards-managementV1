"use client";

import { useState, Suspense, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getActiveCompanyId } from "@/lib/authUtils";
import RevenueOverview from "@/components/views/dashboard/RevenueOverview";
import ActiveTableSessions from "@/components/views/dashboard/ActiveTableSessions";
import ProductPerformance from "@/components/views/dashboard/ProductPerformance";
import FinancialTrends from "@/components/views/dashboard/FinancialTrends";
import InventoryAlerts from "@/components/views/dashboard/InventoryAlerts";
import ActivityLogFeed from "@/components/views/dashboard/ActivityLogFeed";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCog, PlusCircle, Building } from "lucide-react";

export default function DashboardContent() {
  const { profile } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const activeCompanyId = getActiveCompanyId(profile);

  if (!activeCompanyId) {
    // Special view for superadmins without a company
    if (profile?.role === "SUPERADMIN") {
      return (
        <div className="flex flex-col gap-6">
          <Card className="dashboard-card border-l-4 border-l-blue-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Welcome to Billiards Management Platform</CardTitle>
              <CardDescription className="text-muted-foreground">
                System Administration Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-accent/30 p-4 rounded-md">
                <h3 className="font-medium text-lg mb-2">Getting Started</h3>
                <ul className="space-y-2">
                  <li>
                    <Button asChild variant="link" className="h-auto p-0 text-primary">
                      <Link href="/dashboard/admin/users">
                        <UserCog className="h-4 w-4 mr-2 inline" />
                        Manage User Accounts
                      </Link>
                    </Button>
                  </li>
                  <li>
                    <Button asChild variant="link" className="h-auto p-0 text-primary">
                      <Link href="/dashboard/settings">
                        <PlusCircle className="h-4 w-4 mr-2 inline" />
                        Create a New Venue
                      </Link>
                    </Button>
                  </li>
                  <li>
                    <Button asChild variant="link" className="h-auto p-0 text-primary">
                      <Link href="/company-selection">
                        <Building className="h-4 w-4 mr-2 inline" />
                        Select an Existing Venue
                      </Link>
                    </Button>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          {/* Admin Tools Section */}
          <Card className="dashboard-card border-l-4 border-l-amber-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Administration Tools</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage the platform and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex justify-start items-center gap-2 hover:border-primary hover:bg-primary/5"
                  asChild
                >
                  <Link href="/dashboard/admin/users">
                    <UserCog className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">User Management</div>
                      <div className="text-sm text-muted-foreground">
                        Update roles and permissions
                      </div>
                    </div>
                  </Link>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 flex justify-start items-center gap-2 hover:border-primary hover:bg-primary/5"
                  asChild
                >
                  <Link href="/dashboard/settings">
                    <Building className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Venue Management</div>
                      <div className="text-sm text-muted-foreground">
                        Create and configure venues
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Default view for non-superadmins without a company
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No active company selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RevenueOverview companyId={activeCompanyId} />
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-accent/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-sm">Business Overview</TabsTrigger>
          <TabsTrigger value="tables" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-sm">Active Tables</TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-sm">Product Performance</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-sm">Financial Trends</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-sm">Inventory</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-sm">Activity Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="dashboard-card border-l-4 border-l-blue-500/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Active Tables</CardTitle>
                <CardDescription className="text-muted-foreground">Currently active table sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveTableSessions companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card className="dashboard-card border-l-4 border-l-green-500/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Top Products</CardTitle>
                <CardDescription className="text-muted-foreground">Best selling products this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductPerformance companyId={activeCompanyId} />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="dashboard-card border-l-4 border-l-purple-500/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Financial Trends</CardTitle>
                <CardDescription className="text-muted-foreground">Income vs Expense this month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <FinancialTrends companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card className="dashboard-card border-l-4 border-l-amber-500/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Inventory Alerts</CardTitle>
                <CardDescription className="text-muted-foreground">Items below critical threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryAlerts companyId={activeCompanyId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tables">
          <Card className="dashboard-card border-l-4 border-l-blue-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Active Table Sessions</CardTitle>
              <CardDescription className="text-muted-foreground">Currently active table sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveTableSessions companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products">
          <Card className="dashboard-card border-l-4 border-l-green-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Product Performance</CardTitle>
              <CardDescription className="text-muted-foreground">Best selling products this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductPerformance companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="finance">
          <Card className="dashboard-card border-l-4 border-l-purple-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Financial Trends</CardTitle>
              <CardDescription className="text-muted-foreground">Income vs Expense over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <FinancialTrends companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inventory">
          <Card className="dashboard-card border-l-4 border-l-amber-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Inventory Alerts</CardTitle>
              <CardDescription className="text-muted-foreground">Items below critical threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryAlerts companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <Card className="dashboard-card border-l-4 border-l-sky-500/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Activity Log</CardTitle>
              <CardDescription className="text-muted-foreground">Recent system activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogFeed companyId={activeCompanyId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 