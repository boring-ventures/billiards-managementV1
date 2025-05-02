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
    // First, try to get the user using supabase.auth.getUser() which is more reliable
    // than getSession() according to Supabase docs
    const supabase = getServerSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    // If there's no valid user session, redirect to sign-in
    if (userError || !userData.user) {
      return redirect("/sign-in");
    }
    
    // Get the full session with role and company info
    const session = await auth();

    if (!session) {
      return redirect("/sign-in");
    }

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
  } catch (error) {
    console.error("Error in dashboard layout:", error);
    return redirect("/sign-in");
  }
} 