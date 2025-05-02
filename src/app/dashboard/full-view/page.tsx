"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

// Import all components with React.lazy
import dynamic from "next/dynamic";

const DynamicRevenueOverview = dynamic(
  () => import("@/components/views/dashboard/RevenueOverview"),
  { loading: () => <LoadingSection title="Revenue Overview" /> }
);

const DynamicActiveTableSessions = dynamic(
  () => import("@/components/views/dashboard/ActiveTableSessions"),
  { loading: () => <LoadingSection title="Active Tables" /> }
);

const DynamicProductPerformance = dynamic(
  () => import("@/components/views/dashboard/ProductPerformance"),
  { loading: () => <LoadingSection title="Product Performance" /> }
);

const DynamicFinancialTrends = dynamic(
  () => import("@/components/views/dashboard/FinancialTrends"),
  { loading: () => <LoadingSection title="Financial Trends" /> }
);

const DynamicInventoryAlerts = dynamic(
  () => import("@/components/views/dashboard/InventoryAlerts"),
  { loading: () => <LoadingSection title="Inventory Alerts" /> }
);

const DynamicActivityLogFeed = dynamic(
  () => import("@/components/views/dashboard/ActivityLogFeed"),
  { loading: () => <LoadingSection title="Activity Log" /> }
);

function LoadingSection({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Loading {title}...</p>
    </div>
  );
}

export default function DashboardFullView() {
  const router = useRouter();
  const { user, profile, isLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [ready, setReady] = useState(false);
  
  // Get company ID from profile or localStorage
  const activeCompanyId = profile?.companyId || 
    (typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null);

  useEffect(() => {
    // Delay to reduce initial load
    const timer = setTimeout(() => {
      setReady(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (isLoading || !ready) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no company ID, redirect back to dashboard
  if (!activeCompanyId) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-6">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2" 
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Details</h1>
          <p className="text-muted-foreground mt-1">
            Full analytics and reporting
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <DynamicRevenueOverview companyId={activeCompanyId} />
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
                <DynamicActiveTableSessions companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card className="dashboard-card border-l-4 border-l-green-500/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Top Products</CardTitle>
                <CardDescription className="text-muted-foreground">Best selling products this week</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicProductPerformance companyId={activeCompanyId} />
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
                <DynamicFinancialTrends companyId={activeCompanyId} />
              </CardContent>
            </Card>
            
            <Card className="dashboard-card border-l-4 border-l-amber-500/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Inventory Alerts</CardTitle>
                <CardDescription className="text-muted-foreground">Items below critical threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicInventoryAlerts companyId={activeCompanyId} />
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
              <DynamicActiveTableSessions companyId={activeCompanyId} fullView />
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
              <DynamicProductPerformance companyId={activeCompanyId} fullView />
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
              <DynamicFinancialTrends companyId={activeCompanyId} fullView />
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
              <DynamicInventoryAlerts companyId={activeCompanyId} fullView />
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
              <DynamicActivityLogFeed companyId={activeCompanyId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 