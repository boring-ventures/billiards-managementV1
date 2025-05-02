import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
} 