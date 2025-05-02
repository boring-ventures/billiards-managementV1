import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // First check the Supabase session directly to handle token issues
    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    
    // Only redirect if we have a valid user and no errors
    if (data?.user && !error) {
      try {
        const session = await auth();
        
        // Only redirect if we have a full session with role info
        if (session?.user?.id) {
          // Redirect to dashboard only if we're on an auth page
          return redirect("/dashboard");
        }
      } catch (authError) {
        console.error("Error in auth layout while calling auth():", authError);
        // If there are errors getting the full session, still show auth pages
      }
    }
    
    // Otherwise, show the auth pages
    return <>{children}</>;
  } catch (error: any) {
    // Catch NEXT_REDIRECT errors and let them pass through
    if (error.message === 'NEXT_REDIRECT') {
      throw error; // Let Next.js handle the redirect
    }
    
    console.error("Error in auth layout:", error);
    // If there are any errors, show the auth pages
    return <>{children}</>;
  }
}
