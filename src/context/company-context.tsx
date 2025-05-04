"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";
import { useAuth } from "@/hooks/use-auth";

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
  // Also use the more reliable useAuth hook as backup
  const { isSuperAdmin: isSuperAdminFromAuth } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const redirectAttempted = useRef(false);

  // First effect: Set up superadmin status and company ID for non-superadmins
  useEffect(() => {
    // Check if user is superadmin using multiple methods for reliability
    if (!isLoading && profile) {
      console.log("CompanySelection - User profile:", {
        id: profile.id,
        role: profile.role,
        companyId: profile.companyId
      });
      
      const profileIsSuperAdmin = profile && (
        profile.role === UserRole.SUPERADMIN || 
        String(profile.role).toUpperCase() === 'SUPERADMIN'
      );
      
      // Use both profile and auth context to determine superadmin status
      const determinedIsSuperAdmin = profileIsSuperAdmin || isSuperAdminFromAuth;
      
      console.log("CompanyContext - Determined superadmin status:", {
        profileRole: profile.role,
        profileIsSuperAdmin,
        isSuperAdminFromAuth,
        finalDetermination: determinedIsSuperAdmin
      });
      
      setIsSuperadmin(determinedIsSuperAdmin);
      
      // If user has a company assigned and is not a superadmin, use that
      if (profile.companyId && !determinedIsSuperAdmin) {
        setSelectedCompanyId(profile.companyId);
      }
      
      setInitialized(true);
    }
  }, [isLoading, profile, isSuperAdminFromAuth]);

  // Second effect: Handle localStorage for superadmins (client-side only)
  useEffect(() => {
    // Only run on client-side after initialization
    if (typeof window !== 'undefined' && initialized && isSuperadmin && !redirectAttempted.current) {
      try {
        const storedCompanyId = localStorage.getItem("selectedCompanyId");
        console.log("CompanyContext - Stored company ID from localStorage:", storedCompanyId);
        
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
              console.log("CompanyContext - No company selected, redirecting to selection");
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
    console.log("CompanyContext - Setting selected company ID:", id);
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

  // Log current context state for debugging
  useEffect(() => {
    console.log("CompanyContext - Current state:", {
      isSuperadmin,
      selectedCompanyId,
      initialized
    });
  }, [isSuperadmin, selectedCompanyId, initialized]);

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