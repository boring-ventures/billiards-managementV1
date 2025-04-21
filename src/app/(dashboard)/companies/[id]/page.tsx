import { CompanyDetails } from "@/components/companies/company-details";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Company Details - Billiards Management",
  description: "View company details",
};

interface CompanyDetailsPageProps {
  params: {
    id: string;
  };
}

function CompanyDetailsSkeleton() {
  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-40 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-full max-w-md" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </div>

              <div>
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-56" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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

export default async function CompanyDetailsPage({
  params,
}: CompanyDetailsPageProps) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Check if user has super admin role
  const userRole = await getUserRole(session.user.id);

  if (userRole !== "SUPER_ADMIN") {
    // Redirect to dashboard with access denied message
    redirect("/dashboard?error=access_denied");
  }

  return (
    <Suspense fallback={<CompanyDetailsSkeleton />}>
      <CompanyDetails companyId={params.id} />
    </Suspense>
  );
}
