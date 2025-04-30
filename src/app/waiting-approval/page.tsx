"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { UserRole } from "@prisma/client";

export default function WaitingApprovalPage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();

  useEffect(() => {
    // If user is a SUPERADMIN, redirect to company selection
    if (!isLoading && profile?.role === UserRole.SUPERADMIN) {
      router.push("/company-selection");
      return;
    }

    // If user has a company assigned, redirect to dashboard
    if (!isLoading && profile?.companyId) {
      router.push("/dashboard");
      return;
    }
  }, [isLoading, profile, router]);

  if (isLoading) {
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
            <p className="mb-4 text-base">
              Please wait for your venue manager to assign you to a pool hall or billiards venue.
            </p>
            <p className="text-sm text-muted-foreground">
              Once assigned, you&apos;ll receive an email notification and be able to access your venue dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 