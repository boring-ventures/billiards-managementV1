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
    const { data, error } = await supabase.auth.getSession();
    
    // If there's a valid session and no errors, use our main auth function
    if (data.session && !error) {
      const session = await auth();
      
      if (session) {
        redirect("/dashboard");
      }
    }
    
    // If we have token errors or no session, we should stay on the auth page
    return <>{children}</>;
  } catch (error) {
    console.error("Error in auth layout:", error);
    // If there are any errors, show the auth pages
    return <>{children}</>;
  }
}
