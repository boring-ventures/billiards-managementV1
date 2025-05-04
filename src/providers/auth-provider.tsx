"use client";

import { AuthProvider as AuthContextProvider, useAuth } from '@/hooks/use-auth';

// Re-export the hook for components to import
export { useAuth };

// This is a client-side component that provides authentication context
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
} 