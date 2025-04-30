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
      router.push("/select-company");
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
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-2">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-center">Account Pending</CardTitle>
          <CardDescription className="text-center">
            Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">
            Please wait for your company administrator to assign you to a workspace.
          </p>
          <p className="text-sm text-muted-foreground">
            Once assigned, you'll receive an email notification and be able to access your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 