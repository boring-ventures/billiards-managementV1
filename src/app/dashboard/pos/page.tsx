"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2 } from "lucide-react";

export default function POSPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Redirect if not authenticated
      if (!user) {
        router.push("/sign-in");
        return;
      }

      // Redirect if no company selected
      if (!profile?.companyId) {
        router.push("/company-selection");
        return;
      }

      // Redirect if waiting for approval
      if (!profile.active) {
        router.push("/waiting-approval");
        return;
      }

      setLoading(false);
    }
  }, [user, profile, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-muted-foreground">
          Process sales and manage orders
        </p>
      </div>

      <div className="grid gap-6">
        {/* POS content will go here */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold">POS System</h3>
          <p className="text-muted-foreground mt-2">POS features coming soon</p>
        </div>
      </div>
    </div>
  );
} 