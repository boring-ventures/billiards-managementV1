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
    // First, check if we have a user from Supabase
    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    
    // If no user or error, redirect to sign-in
    if (error || !data?.user) {
      console.error("Dashboard auth error:", error?.message);
      // Return the redirect to prevent rendering anything else
      return redirect("/sign-in");
    }
    
    // Get the full session with role and company info
    try {
      const session = await auth();

      if (!session?.user?.id) {
        console.error("Missing session or user in dashboard layout");
        return redirect("/sign-in");
      }
      
      // Continue with rendering the dashboard if we have a valid session
      return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
    } catch (authError) {
      console.error("Error in dashboard layout auth():", authError);
      return redirect("/sign-in");
    }
  } catch (error) {
    console.error("Error in dashboard layout:", error);
    return redirect("/sign-in");
  }
} 