"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard settings page
    router.push("/dashboard/settings");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Redirecting to settings...</p>
    </div>
  );
} 