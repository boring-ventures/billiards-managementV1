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
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RevenueOverview companyId={activeCompanyId} />
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Business Overview</TabsTrigger>
          <TabsTrigger value="tables">Active Tables</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="finance">Financial Trends</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Tables</CardTitle>
                <CardDescription>Currently active table sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveTableSessions companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling products this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductPerformance companyId={activeCompanyId} />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Financial Trends</CardTitle>
                <CardDescription>Income vs Expense this month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <FinancialTrends companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Inventory Alerts</CardTitle>
                <CardDescription>Items below critical threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryAlerts companyId={activeCompanyId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>Active Table Sessions</CardTitle>
              <CardDescription>Currently active table sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveTableSessions companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
              <CardDescription>Best selling products this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductPerformance companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
              <CardDescription>Income vs Expense over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <FinancialTrends companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Alerts</CardTitle>
              <CardDescription>Items below critical threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryAlerts companyId={activeCompanyId} fullView />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent system activities</CardDescription>
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