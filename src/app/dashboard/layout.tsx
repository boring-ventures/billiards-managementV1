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
        // Log this issue but don't redirect - the client component will 
        // handle fetching profile data and company assignment checks
        console.warn("Missing user data in dashboard layout - will rely on client-side fetching");
        
        // Return a special header for debugging
        const headers = new Headers();
        headers.set('X-Server-Auth-Status', 'basic-auth-only');
        headers.set('X-User-Id', data.user.id);
        
        // We have a valid Supabase user, so render the dashboard
        // The client component will handle profile fetching and permission checks
        return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
      }
      
      // We have all the data we need, render the dashboard
      return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
    } catch (profileError) {
      console.error("Error getting user profile:", profileError);
      
      // Log detailed error for debugging
      if (profileError instanceof Error) {
        console.error("Profile error details:", profileError.message);
        console.error("Profile error stack:", profileError.stack);
      }
      
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
    // For any other error, redirect to sign-in for safety
    return redirect("/sign-in");
  }
} 