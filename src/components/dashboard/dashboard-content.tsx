"use client";

import { useState, useEffect, lazy, Suspense } from "react";
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
import { UserCog, PlusCircle, Building, Loader2 } from "lucide-react";

// Simple placeholder component to avoid timeouts
function PlaceholderCard({ 
  title, 
  description, 
  className = "" 
}: { 
  title: string; 
  description: string; 
  className?: string 
}) {
  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
      </CardContent>
    </Card>
  );
}

export default function DashboardContent() {
  const { profile } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const activeCompanyId = profile?.companyId || 
    (typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null);

  useEffect(() => {
    // Simple timeout to indicate content is ready
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (!activeCompanyId) {
    // Special view for superadmins without a company
    if (profile?.role === UserRole.SUPERADMIN) {
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

  // Loading placeholders to avoid timeout issues
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in-50">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PlaceholderCard
            title="Revenue Overview"
            description="Today's financial overview"
            className="border-l-4 border-l-blue-500/70"
          />
          <PlaceholderCard
            title="Active Tables"
            description="Currently active table sessions"
            className="border-l-4 border-l-green-500/70"
          />
          <PlaceholderCard
            title="Inventory Status"
            description="Critical inventory items"
            className="border-l-4 border-l-amber-500/70"
          />
        </div>
      </div>
    );
  }
  
  // Simplified dashboard view with minimal API calls
  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="dashboard-card border-l-4 border-l-blue-500/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">Today's Overview</CardTitle>
            <CardDescription className="text-muted-foreground">
              Welcome to your venue dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-accent/30 p-4 rounded-md">
              <h3 className="font-medium text-lg mb-2">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Button asChild variant="link" className="h-auto p-0 text-primary">
                    <Link href="/dashboard/tables">
                      <Building className="h-4 w-4 mr-2 inline" />
                      Manage Tables
                    </Link>
                  </Button>
                </li>
                <li>
                  <Button asChild variant="link" className="h-auto p-0 text-primary">
                    <Link href="/dashboard/inventory">
                      <PlusCircle className="h-4 w-4 mr-2 inline" />
                      Check Inventory
                    </Link>
                  </Button>
                </li>
                <li>
                  <Button asChild variant="link" className="h-auto p-0 text-primary">
                    <Link href="/dashboard/settings">
                      <UserCog className="h-4 w-4 mr-2 inline" />
                      Venue Settings
                    </Link>
                  </Button>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-l-4 border-l-green-500/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">At a Glance</CardTitle>
            <CardDescription className="text-muted-foreground">
              Key venue metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent/30 p-3 rounded-md">
                <p className="text-xs text-muted-foreground">Active Tables</p>
                <p className="text-2xl font-bold mt-1">--</p>
              </div>
              <div className="bg-accent/30 p-3 rounded-md">
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold mt-1">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-l-4 border-l-amber-500/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                className="w-full justify-start"
                variant="outline"
                asChild
              >
                <Link href="/dashboard/tables/new-session">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Start New Session
                </Link>
              </Button>
              <Button 
                className="w-full justify-start"
                variant="outline"
                asChild
              >
                <Link href="/dashboard/finance/new-transaction">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Record Transaction
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6">
        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">Load Dashboard Modules</CardTitle>
            <CardDescription className="text-muted-foreground">
              Click to load additional dashboard data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              variant="default"
              onClick={() => window.location.href = "/dashboard/full-view"}
            >
              Load Full Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 