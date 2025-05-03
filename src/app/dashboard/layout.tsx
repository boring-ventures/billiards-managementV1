import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";
import { createServerSupabaseClient } from "@/lib/auth-utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Create a supabase client using our custom helper that handles both sync and async cookies API
    const supabase = createServerSupabaseClient();
    
    // Get the user session - using getUser to force token verification
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Dashboard auth error:", error.message);
      return redirect("/sign-in");
    }
    
    if (!data?.user) {
      console.error("Dashboard auth error: Auth session missing!");
      return redirect("/sign-in");
    }
    
    // User is authenticated with Supabase, now get extended profile info
    try {
      const session = await auth();
      
      if (!session?.user) {
        console.error("Missing user data in dashboard layout");
        // Don't redirect here, auth() might not find data in some environments
        // but we already confirmed user is authenticated with Supabase above
      }
      
      // Continue with rendering the dashboard since we have a valid Supabase user
      return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
    } catch (profileError) {
      console.error("Error getting user profile:", profileError);
      // We still have a valid Supabase session, so render the dashboard
      // The profile will be fetched client-side if needed
      return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
    }
  } catch (error: any) {
    // Catch NEXT_REDIRECT errors and let them pass through
    if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error; // Let Next.js handle the redirect
    }
    
    console.error("Error in dashboard layout:", error);
    return redirect("/sign-in");
  }
} 