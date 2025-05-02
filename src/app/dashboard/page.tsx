// Using static generation and dynamic client-side authentication
// This ensures fast initial page load and prevents Vercel timeouts

import DashboardClient from "@/components/dashboard/dashboard-client";

// Static page that renders a client component to handle authentication and content
export default function DashboardPage() {
  return <DashboardClient />;
}

// Ensure this page is statically generated but not cached
export const dynamic = 'force-static';
export const revalidate = 0; 