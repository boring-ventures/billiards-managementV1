"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  const [initialized, setInitialized] = useState(false);
  const redirectAttempted = useRef(false);

  // First effect: Set up superadmin status and company ID for non-superadmins
  useEffect(() => {
    // Check if user is superadmin
    if (!isLoading && profile) {
      setIsSuperadmin(profile.role === UserRole.SUPERADMIN);
      
      // If user has a company assigned, use that
      if (profile.companyId) {
        setSelectedCompanyId(profile.companyId);
      }
      
      setInitialized(true);
    }
  }, [isLoading, profile]);

  // Second effect: Handle localStorage for superadmins (client-side only)
  useEffect(() => {
    // Only run on client-side after initialization
    if (typeof window !== 'undefined' && initialized && isSuperadmin && !redirectAttempted.current) {
      try {
        const storedCompanyId = localStorage.getItem("selectedCompanyId");
        
        if (storedCompanyId) {
          setSelectedCompanyId(storedCompanyId);
        } else if (!isLoading) {
          // If no company is selected, redirect to company selection
          // Mark that we've attempted a redirect to prevent loops
          redirectAttempted.current = true;
          
          // Small timeout to prevent immediate redirection
          setTimeout(() => {
            // Double-check we still need to redirect before doing it
            if (!localStorage.getItem("selectedCompanyId")) {
              router.push("/company-selection");
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
    }
  }, [isSuperadmin, isLoading, router, initialized]);

  // Update the setSelectedCompanyId function to also save to localStorage
  const handleSetSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyId(id);
    
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem("selectedCompanyId", id);
          // Reset the redirect attempt flag when a new company is selected
          redirectAttempted.current = false;
        } else {
          localStorage.removeItem("selectedCompanyId");
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
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