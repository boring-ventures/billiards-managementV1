// Using dynamic server-side rendering with authentication
// This ensures proper authentication checks on each request

import DashboardClient from "@/components/dashboard/dashboard-client";

// Dynamic page that properly handles server-side authentication on each request
export default function DashboardPage() {
  return <DashboardClient />;
}

// Switch from static to dynamic to ensure auth checks run on every request
export const dynamic = 'force-dynamic';
// Remove the revalidate setting as it's not needed with force-dynamic 