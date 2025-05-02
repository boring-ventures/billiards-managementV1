import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Check for token errors first
    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.getSession();
    
    // If there's a token error, we need to redirect to sign-in
    if (error || !data.session) {
      console.error("Dashboard session error:", error?.message);
      redirect("/sign-in");
    }
    
    // Get the full session with role and company info
    const session = await auth();

    if (!session) {
      redirect("/sign-in");
    }

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
  } catch (error) {
    console.error("Error in dashboard layout:", error);
    redirect("/sign-in");
  }
} 