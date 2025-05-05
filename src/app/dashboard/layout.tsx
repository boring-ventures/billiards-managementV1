"use client";

import { ReactNode, Suspense } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchProvider } from "@/context/search-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import SkipToMain from "@/components/skip-to-main";
import { Header } from "@/components/sidebar/header";
import { Search } from "@/components/sidebar/search";
import { ThemeSwitch } from "@/components/sidebar/theme-switch";
import { ProfileDropdown } from "@/components/sidebar/profile-dropdown";
import { ViewAsDropdown } from "@/components/ui/view-as-dropdown";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";
import { UserSwitcher } from "@/components/user-switcher";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Fallback loading component for dashboard sections
 */
function DashboardLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard content...</p>
      </div>
    </div>
  );
}

/**
 * Dashboard content component with error handling 
 */
function DashboardContent({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useCurrentUser();
  const isSuperAdmin = profile?.role === UserRole.SUPERADMIN;

  if (isLoading) {
    return <DashboardLoadingFallback />;
  }

  return (
    <ErrorBoundary section="dashboard-content">
      {/* Add the UserSwitcher for superadmins */}
      {isSuperAdmin && (
        <div className="container mx-auto pt-4 px-4">
          <UserSwitcher />
        </div>
      )}
      
      <Suspense fallback={<DashboardLoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Enhanced Dashboard layout with error handling and loading states
 * This layout provides resilience to errors in the dashboard structure
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ErrorBoundary section="dashboard-layout">
      <SearchProvider>
        <SidebarProvider defaultOpen={true}>
          <SkipToMain />
          <AppSidebar className="fixed inset-y-0 left-0 z-20" />
          <div
            id="content"
            className={cn(
              "ml-auto w-full max-w-full",
              "peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]",
              "peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]",
              "transition-[width] duration-200 ease-linear",
              "flex min-h-screen flex-col",
              "group-data-[scroll-locked=1]/body:h-full",
              "group-data-[scroll-locked=1]/body:has-[main.fixed-main]:min-h-screen"
            )}
          >
            <Header>
              <div className="ml-auto flex items-center space-x-4">
                <Search />
                <ViewAsDropdown />
                <ThemeSwitch />
                <ProfileDropdown />
              </div>
            </Header>
            
            <DashboardContent>
              {children}
            </DashboardContent>
          </div>
        </SidebarProvider>
      </SearchProvider>
    </ErrorBoundary>
  );
} 