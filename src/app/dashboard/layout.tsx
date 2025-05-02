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
    // First, check if we have a user from Supabase using getUser() (recommended by Supabase)
    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    
    // If no user or error, redirect to sign-in
    if (error || !data?.user) {
      console.error("Dashboard auth error:", error?.message || "Auth session missing!");
      // Return the redirect to prevent rendering anything else
      return redirect("/sign-in");
    }
    
    // If we have a user ID, get the full session with role and company info
    const session = await auth();
    
    // Only redirect if no session at all (auth() might find data in development environment)
    if (!session?.user) {
      console.error("Missing user data in dashboard layout");
      return redirect("/sign-in");
    }
    
    // Continue with rendering the dashboard if we have a valid session
    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
  } catch (error: any) {
    // Catch NEXT_REDIRECT errors and let them pass through
    if (error.message === 'NEXT_REDIRECT') {
      throw error; // Let Next.js handle the redirect
    }
    
    console.error("Error in dashboard layout:", error);
    return redirect("/sign-in");
  }
} 