import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // We'll handle authentication in the client component
  // This avoids Next.js server/client inconsistencies with cookies/headers
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
} 