"use client";

import { ReactNode } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";

interface ConditionalNavItemProps {
  children: ReactNode;
  roles?: UserRole[];
  requiresAll?: boolean;
}

/**
 * A component that conditionally renders its children based on user role
 * @param children The content to render if conditions are met
 * @param roles Array of UserRole values that are allowed to see this item
 * @param requiresAll If true, user must have ALL roles. If false, ANY role is sufficient
 */
export function ConditionalNavItem({ 
  children, 
  roles = [], 
  requiresAll = false 
}: ConditionalNavItemProps) {
  const { profile, isLoading } = useCurrentUser();
  
  // If no roles specified, show to everyone
  if (roles.length === 0) return <>{children}</>;
  
  // If still loading, don't show
  if (isLoading || !profile) return null;
  
  const userRole = profile.role;
  
  // Check if user has required role(s)
  const hasAccess = requiresAll
    ? roles.every(role => userRole === role)
    : roles.some(role => userRole === role);
  
  return hasAccess ? <>{children}</> : null;
} 