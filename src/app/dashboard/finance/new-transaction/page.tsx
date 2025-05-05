"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { NewTransactionForm } from "@/components/views/finance/NewTransactionForm";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Profile as RbacProfile } from "@/types/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewTransactionPage() {
  const { profile, isLoading } = useCurrentUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<Error | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Check admin permission when profile changes
    if (profile && !isLoading) {
      setIsCheckingPermission(true);
      
      // Add a try/catch to handle potential permission check errors
      try {
        hasAdminPermission(profile as RbacProfile | null)
          .then(result => {
            setIsAdmin(result);
            
            // Only redirect if definitely not an admin
            if (result === false) {
              console.log("User does not have admin permission, redirecting");
              router.push("/dashboard/finance/transactions");
            }
          })
          .catch(err => {
            console.error("Error checking admin permission:", err);
            setPermissionError(err instanceof Error ? err : new Error(String(err)));
            // Don't redirect on error - show error UI instead
          })
          .finally(() => {
            setIsCheckingPermission(false);
          });
      } catch (err) {
        console.error("Unexpected error in permission check:", err);
        setPermissionError(err instanceof Error ? err : new Error(String(err)));
        setIsCheckingPermission(false);
      }
    } else if (!isLoading && !profile) {
      // Handle case where profile is not loading but also not available
      setProfileError(new Error("Profile could not be loaded"));
    }
  }, [profile, isLoading, router]);

  // Determine what to render based on various states
  const renderContent = () => {
    // Handle profile loading
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading user profile...</p>
        </div>
      );
    }
    
    // Handle profile error
    if (profileError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load your profile. Please try refreshing the page.
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs overflow-auto max-h-32">
                {profileError.message}
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    
    // Handle permission error
    if (permissionError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Permission Error</AlertTitle>
          <AlertDescription>
            There was an error checking your permissions. Please try refreshing the page.
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs overflow-auto max-h-32">
                {permissionError.message}
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    
    // Handle permission check in progress
    if (isCheckingPermission || isAdmin === null) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      );
    }
    
    // Handle insufficient permissions (no redirect case)
    if (isAdmin === false) {
      return (
        <Alert className="my-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to create new transactions.
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push("/dashboard/finance/transactions")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Transactions
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    // If we've reached here, user is an admin and can see the form
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-md shadow">
        <NewTransactionForm 
          onSuccess={() => router.push("/dashboard/finance/transactions")} 
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Transaction</h1>
          <p className="text-muted-foreground">
            Create a new financial transaction
          </p>
        </div>
        
        <Button variant="outline" onClick={() => router.push("/dashboard/finance/transactions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
      </div>

      {renderContent()}
    </div>
  );
} 