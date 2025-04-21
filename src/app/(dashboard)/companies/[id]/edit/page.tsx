import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/forms/company-form";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Edit Company - Billiards Management",
  description: "Edit company details",
};

interface EditCompanyPageProps {
  params: {
    id: string;
  };
}

export default async function EditCompanyPage({
  params,
}: EditCompanyPageProps) {
  // Extract id for safety
  const id = params.id;

  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Get company data
  const company = await db.company.findUnique({
    where: {
      id: id,
    },
  });

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Company</h1>
          <p className="text-muted-foreground">
            Update company details for {company.name}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/companies/${id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <CompanyForm
          initialData={{
            id: company.id,
            name: company.name,
            address: company.address,
            phone: company.phone,
          }}
          isDialog={false}
        />
      </div>
    </div>
  );
}
