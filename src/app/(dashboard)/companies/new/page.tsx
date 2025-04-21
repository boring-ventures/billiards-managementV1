import { CompanyForm } from "@/components/forms/company-form";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Add New Company - Billiards Management",
  description: "Add a new billiards company",
};

export default async function NewCompanyPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Add New Company</h1>
          <p className="text-muted-foreground">
            Create a new billiards company or venue
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/companies">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <CompanyForm />
      </div>
    </div>
  );
}
