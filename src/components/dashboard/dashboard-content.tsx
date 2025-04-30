"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/context/company-context";

export default function DashboardContent() {
  const { profile } = useCurrentUser();
  const { selectedCompanyId } = useCompany();
  
  // In a real application, you would fetch data based on the company context

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Welcome to your dashboard. You are viewing data for company ID: {profile?.companyId || selectedCompanyId}
        </p>
      </div>

      {/* Add more dashboard sections here */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Tables</h3>
          <p className="text-muted-foreground">Manage your billiard tables</p>
        </div>
        <div className="bg-card rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Inventory</h3>
          <p className="text-muted-foreground">Track your inventory items</p>
        </div>
        <div className="bg-card rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Reports</h3>
          <p className="text-muted-foreground">View your sales reports</p>
        </div>
      </div>
    </div>
  );
} 