"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Loader2 } from "lucide-react";
import { UserRole } from "@prisma/client";
import { useCompany } from "@/context/company-context";

interface Company {
  id: string;
  name: string;
}

export default function CompanySelectionPage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const { setSelectedCompanyId } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fetchingCompanies, setFetchingCompanies] = useState(true);
  const [selectingCompany, setSelectingCompany] = useState(false);

  useEffect(() => {
    // Add detailed logging
    if (!isLoading && profile) {
      console.log("CompanySelection - User profile:", {
        id: profile.id,
        role: profile.role,
        companyId: profile.companyId
      });
    }
    
    // Check if the user is a superadmin using multiple methods
    const isSuperAdmin = profile && (
      profile.role === UserRole.SUPERADMIN || 
      String(profile.role).toUpperCase() === UserRole.SUPERADMIN
    );
    
    console.log("CompanySelection - Is superadmin:", isSuperAdmin);
    
    // If user is not a SUPERADMIN, redirect to the waiting page
    if (!isLoading && profile && !isSuperAdmin) {
      console.log("CompanySelection - User is not a superadmin, redirecting to waiting-approval");
      router.push("/waiting-approval");
      return;
    }

    // If user is not a SUPERADMIN and has a companyId, redirect to dashboard
    if (!isLoading && profile?.companyId && !isSuperAdmin) {
      console.log("CompanySelection - User has company, redirecting to dashboard");
      router.push("/dashboard");
      return;
    }

    // Fetch companies if user is a SUPERADMIN
    const fetchCompanies = async () => {
      try {
        if (isSuperAdmin) {
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

    if (!isLoading && isSuperAdmin) {
      fetchCompanies();
    }
  }, [isLoading, profile, router]);

  const selectCompany = async (companyId: string) => {
    setSelectingCompany(true);
    
    try {
      // Save the selected company to localStorage
      localStorage.setItem("selectedCompanyId", companyId);
      
      // Set the selected company in the context
      setSelectedCompanyId(companyId);
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error selecting company:", error);
    } finally {
      setSelectingCompany(false);
    }
  };

  if (isLoading || selectingCompany) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl">
        <Card className="shadow-lg border-border/30">
          <CardHeader className="pb-3">
            <div className="flex justify-center mb-4">
              <Building className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">Select a Venue</CardTitle>
            <CardDescription className="text-center pt-2">
              As a Superadmin, you can access any pool hall or billiards venue in the system.
              Select a venue to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {fetchingCompanies ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No venues found.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map((company) => (
                  <Button
                    key={company.id}
                    variant="outline"
                    className="h-auto p-4 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
                    onClick={() => selectCompany(company.id)}
                    disabled={selectingCompany}
                  >
                    <div className="flex items-center gap-2">
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
    </div>
  );
} 