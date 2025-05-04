import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client";
import { createServerSupabaseClient } from "@/lib/auth-utils";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Create a supabase client using our custom helper that handles both sync and async cookies API
    const supabase = createServerSupabaseClient();
    
    // Get the user session directly - using getUser to force token verification
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Dashboard auth error:", error.message);
      
      // Check if this is a session token issue that middleware should handle
      if (error.message.includes('JWT') || error.message.includes('token')) {
        console.log("JWT/Token error - middleware should handle refresh on retry");
        // Let the client component handle the situation with possible fallbacks
        return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
      }
      
      return redirect("/sign-in");
    }
    
    if (!data?.user) {
      console.error("Dashboard auth error: No user in session!");
      
      // We should only redirect if we're confident there's no active session
      // Check request headers for additional context
      // @ts-ignore - In Next.js 14, headers() is synchronous despite the types
      const headersList = headers();
      const cookieHeader = headersList.get('cookie') || '';
      const hasAuthCookie = cookieHeader.includes('sb-');
      
      if (!hasAuthCookie) {
        // No auth cookie present, definitely not authenticated
        return redirect("/sign-in");
      }
      
      // There's a cookie but getUser didn't return a user
      // This could be a race condition - let client component try to recover
      console.log("Auth cookie present but no user - middleware may be refreshing");
      return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
    }
    
    // User is authenticated with Supabase, now get extended profile info if needed
    try {
      const session = await auth();
      
      if (!session?.user) {
        // Log this issue but don't redirect - the client component will 
        // handle fetching profile data and company assignment checks
        console.log("Supabase auth verified but Next auth failed - using client-side fallback");
        
        // We're authenticated with Supabase at least, so render the dashboard
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
    // For any other error, try to render the dashboard anyway
    // Client-side logic will redirect if needed
    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
  }
} 