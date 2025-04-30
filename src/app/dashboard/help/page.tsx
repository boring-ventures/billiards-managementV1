"use client";

import { useCurrentUser } from "@/hooks/use-current-user";

export default function HelpPage() {
  const { profile, isLoading } = useCurrentUser();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and get support
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Help documentation coming soon
        </p>
      </div>
    </div>
  );
} 