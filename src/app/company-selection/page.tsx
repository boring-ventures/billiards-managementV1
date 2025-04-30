"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Loader2 } from "lucide-react";
import { UserRole } from "@prisma/client";

interface Company {
  id: string;
  name: string;
}

export default function CompanySelectionPage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fetchingCompanies, setFetchingCompanies] = useState(true);

  useEffect(() => {
    // If user is not a SUPERADMIN, redirect to the waiting page
    if (!isLoading && profile && profile.role !== UserRole.SUPERADMIN) {
      router.push("/waiting-approval");
      return;
    }

    // If user is not a SUPERADMIN and has a companyId, redirect to dashboard
    if (!isLoading && profile && profile.companyId) {
      router.push("/dashboard");
      return;
    }

    // Fetch companies if user is a SUPERADMIN
    const fetchCompanies = async () => {
      try {
        if (profile?.role === UserRole.SUPERADMIN) {
          const response = await fetch("/api/companies");
          const data = await response.json();
          setCompanies(data.companies || []);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setFetchingCompanies(false);
      }
    };

    if (!isLoading && profile?.role === UserRole.SUPERADMIN) {
      fetchCompanies();
    }
  }, [isLoading, profile, router]);

  const selectCompany = (companyId: string) => {
    // Save the selected company to localStorage
    localStorage.setItem("selectedCompanyId", companyId);
    
    // Redirect to dashboard
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Select a Workspace</CardTitle>
          <CardDescription>
            As a Superadmin, you can access any workspace in the system.
            Select a workspace to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fetchingCompanies ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No workspaces found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <Button
                  key={company.id}
                  variant="outline"
                  className="h-auto p-4 justify-start flex flex-col items-start space-y-2"
                  onClick={() => selectCompany(company.id)}
                >
                  <div className="flex items-center gap-2 text-left">
                    <Building className="h-5 w-5 text-primary" />
                    <span className="font-medium text-base">{company.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 