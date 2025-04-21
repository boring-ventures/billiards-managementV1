import { CompanyDetails } from "@/components/companies/company-details";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Company Details - Billiards Management",
  description: "View company details",
};

interface CompanyDetailsPageProps {
  params: {
    id: string;
  };
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

  return <CompanyDetails companyId={params.id} />;
}
