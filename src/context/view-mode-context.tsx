"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { UserRole } from "@prisma/client";
import { useCurrentUser } from "@/hooks/use-current-user";

type ViewMode = UserRole | null;

type ViewModeContextType = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  resetViewMode: () => void;
  canAccessViewMode: boolean;
  actualRole: UserRole | undefined;
};

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: null,
  setViewMode: () => {},
  resetViewMode: () => {},
  canAccessViewMode: false,
  actualRole: undefined,
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useCurrentUser();
  const [viewMode, setViewModeState] = useState<ViewMode>(null);
  const [actualRole, setActualRole] = useState<UserRole | undefined>(undefined);
  const [canAccessViewMode, setCanAccessViewMode] = useState(false);

  // Initialize on first load
  useEffect(() => {
    if (!isLoading && profile) {
      // Store the actual role
      setActualRole(profile.role);
      
      // Only superadmins can access this feature
      setCanAccessViewMode(profile.role === UserRole.SUPERADMIN);
      
      // Try to retrieve stored view mode from localStorage
      if (typeof window !== 'undefined' && profile.role === UserRole.SUPERADMIN) {
        try {
          const savedViewMode = localStorage.getItem('viewMode') as UserRole | null;
          if (savedViewMode && Object.values(UserRole).includes(savedViewMode)) {
            setViewModeState(savedViewMode);
          }
        } catch (error) {
          console.error("Error accessing localStorage:", error);
        }
      }
    }
  }, [isLoading, profile]);

  // Function to set the view mode
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    
    // Save to localStorage if available
    if (typeof window !== 'undefined') {
      try {
        if (mode) {
          localStorage.setItem('viewMode', mode);
        } else {
          localStorage.removeItem('viewMode');
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
    }
  };

  // Function to reset view mode to actual role
  const resetViewMode = () => {
    setViewModeState(null);
    
    // Remove from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('viewMode');
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
    }
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        resetViewMode,
        canAccessViewMode,
        actualRole,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
} 