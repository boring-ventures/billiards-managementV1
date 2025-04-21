import { CompanyList } from "@/components/companies/company-list";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Building, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Billiards Management - Companies",
  description: "Manage your billiards companies",
};

export default async function CompaniesPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Building className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Companies</h1>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <ArrowRight className="h-4 w-4" />
        <p>Manage your billiards companies and venues.</p>
      </div>

      <CompanyList />
    </div>
  );
}
