"use client";

import { useState } from "react";
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

export default function DashboardContent() {
  const { profile } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const activeCompanyId = getActiveCompanyId(profile);

  if (!activeCompanyId) {
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
            <Card className="dashboard-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Active Tables</CardTitle>
                <CardDescription className="text-muted-foreground">Currently active table sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveTableSessions companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card className="dashboard-card">
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
            <Card className="dashboard-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Financial Trends</CardTitle>
                <CardDescription className="text-muted-foreground">Income vs Expense this month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <FinancialTrends companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card className="dashboard-card">
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
          <Card className="dashboard-card">
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
          <Card className="dashboard-card">
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
          <Card className="dashboard-card">
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
          <Card className="dashboard-card">
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
          <Card className="dashboard-card">
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