"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/context/company-context";

export default function InventoryPage() {
  const router = useRouter();
  const { profile } = useCurrentUser();
  const { selectedCompanyId } = useCompany();

  useEffect(() => {
    // If no company is selected, redirect to dashboard
    if (!selectedCompanyId) {
      router.push("/dashboard");
    }
  }, [router, selectedCompanyId]);

  if (!selectedCompanyId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Inventory management content will be displayed here.</p>
      </div>
    </div>
  );
} 