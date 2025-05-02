"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Building } from "lucide-react";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";

// Interface for company selection
interface Company {
  id: string;
  name: string;
}

export default function WaitingApprovalPage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fetchingCompanies, setFetchingCompanies] = useState(true);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  useEffect(() => {
    // Add detailed logging
    if (!isLoading && profile) {
      console.log("WaitingApproval - User profile:", {
        id: profile.id,
        role: profile.role,
        companyId: profile.companyId
      });
    }
    
    // If user is a SUPERADMIN, redirect to company selection or dashboard
    if (!isLoading && profile) {
      // Check role in multiple ways to be robust
      const isSuperAdmin = 
        profile.role === UserRole.SUPERADMIN || 
        String(profile.role).toUpperCase() === UserRole.SUPERADMIN;
      
      console.log("WaitingApproval - Is superadmin:", isSuperAdmin);
      
      if (isSuperAdmin) {
        console.log("WaitingApproval - Redirecting superadmin to company selection");
        router.push("/company-selection");
        return;
      }
    }

    // If user has a company assigned, redirect to dashboard
    if (!isLoading && profile?.companyId) {
      router.push("/dashboard");
      return;
    }

    // Fetch available companies for selection
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies/available");
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.companies || []);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setFetchingCompanies(false);
      }
    };

    if (!isLoading && profile && !profile.companyId) {
      fetchCompanies();
    }
  }, [isLoading, profile, router]);

  // Function to request joining a company
  const requestJoinCompany = async (companyId: string) => {
    setRequestingJoin(true);
    
    try {
      const response = await fetch("/api/companies/join-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          message: `I'd like to join this venue.`
        }),
      });

      if (response.ok) {
        setRequestMessage("Your request has been sent. Please wait for approval from the venue admin.");
      } else {
        const data = await response.json();
        setRequestMessage(`Error: ${data.error || "Failed to send request"}`);
      }
    } catch (error) {
      console.error("Error requesting to join company:", error);
      setRequestMessage("An unexpected error occurred. Please try again later.");
    } finally {
      setRequestingJoin(false);
    }
  };

  if (isLoading || requestingJoin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-border/30">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-50 p-3">
                <AlertCircle className="h-12 w-12 text-yellow-500" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Account Pending</CardTitle>
            <CardDescription className="text-center pt-2">
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-2 pb-8">
            {requestMessage ? (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
                {requestMessage}
              </div>
            ) : null}
            
            <p className="mb-4 text-base">
              Please select a venue you would like to join, or wait for an admin to assign you.
            </p>
            
            {fetchingCompanies ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No venues are available for selection. Please wait for a venue manager to assign you.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium mb-2">Available venues:</p>
                {companies.map((company) => (
                  <Button
                    key={company.id}
                    variant="outline"
                    className="w-full text-left justify-start"
                    onClick={() => requestJoinCompany(company.id)}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    {company.name}
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