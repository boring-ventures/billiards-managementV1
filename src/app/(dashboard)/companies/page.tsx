import { CompanyList } from "@/components/companies/company-list";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Building, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Billiards Management - Companies",
  description: "Manage your billiards companies",
};

function CompanyListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <div className="relative w-full">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="rounded-md border">
        <div className="h-10 border-b p-2 flex items-center gap-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>

        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 border-b p-4 flex justify-between">
            <div className="flex items-center gap-6">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <Skeleton className="h-5 w-64" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

async function getUserRole(userId: string) {
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { role: true },
    });
    return profile?.role || null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}

export default async function CompaniesPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Check if user has super admin role
  const userRole = await getUserRole(session.user.id);

  if (userRole !== "SUPERADMIN") {
    // Redirect to dashboard with access denied message
    redirect("/dashboard?error=access_denied");
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Companies</h1>
        </div>

        <div className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full flex items-center">
          <span className="font-medium">Super Admin Access</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <ArrowRight className="h-4 w-4" />
        <p>Manage your billiards companies and venues.</p>
      </div>

      <Suspense fallback={<CompanyListSkeleton />}>
        <CompanyList />
      </Suspense>
    </div>
  );
}
