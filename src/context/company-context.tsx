"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";

type CompanyContextType = {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  isSuperadmin: boolean;
};

const CompanyContext = createContext<CompanyContextType>({
  selectedCompanyId: null,
  setSelectedCompanyId: () => {},
  isSuperadmin: false,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    // Check if user is superadmin
    if (!isLoading && profile) {
      setIsSuperadmin(profile.role === UserRole.SUPERADMIN);
      
      // If user has a company assigned, use that
      if (profile.companyId) {
        setSelectedCompanyId(profile.companyId);
      }
    }
  }, [isLoading, profile]);

  useEffect(() => {
    // Only run for superadmins
    if (isSuperadmin) {
      // Try to get selected company from localStorage
      const storedCompanyId = localStorage.getItem("selectedCompanyId");
      
      if (storedCompanyId) {
        setSelectedCompanyId(storedCompanyId);
      } else if (!isLoading) {
        // If no company is selected, redirect to company selection
        router.push("/company-selection");
      }
    }
  }, [isSuperadmin, isLoading, router]);

  // Update the setSelectedCompanyId function to also save to localStorage
  const handleSetSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyId(id);
    
    if (id) {
      localStorage.setItem("selectedCompanyId", id);
    } else {
      localStorage.removeItem("selectedCompanyId");
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        selectedCompanyId,
        setSelectedCompanyId: handleSetSelectedCompanyId,
        isSuperadmin,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext); 