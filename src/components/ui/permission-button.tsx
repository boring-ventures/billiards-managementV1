"use client";

import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useAuth, PermissionAction } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type PermissionButtonProps = ButtonProps & {
  sectionKey: string;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode | null;
  showTooltip?: boolean;
  tooltipMessage?: string;
};

/**
 * A permission-aware button component that conditionally renders based on user permissions
 * 
 * @param sectionKey The section key to check permissions against
 * @param action The action to check (view, create, edit, delete)
 * @param children The button content
 * @param fallback Optional element to render when permission is denied (defaults to null)
 * @param showTooltip Whether to show a tooltip when permission is denied but button is visible
 * @param tooltipMessage Custom tooltip message (defaults to "You don't have permission")
 * @param {...ButtonProps} buttonProps Any other props to pass to the Button component 
 */
export function PermissionButton({
  sectionKey,
  action,
  children,
  fallback = null,
  showTooltip = false,
  tooltipMessage = "You don't have permission to perform this action",
  ...buttonProps
}: PermissionButtonProps) {
  const { hasPermissionClient } = useAuth();
  const hasPermission = hasPermissionClient(sectionKey, action);

  // If user doesn't have permission and no fallback is provided, render nothing
  if (!hasPermission && !fallback) {
    return null;
  }

  // If user doesn't have permission but a fallback is provided, render the fallback
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  // If user has permission and no tooltip is needed, render the button normally
  if (!showTooltip) {
    return <Button {...buttonProps}>{children}</Button>;
  }

  // If user has permission and tooltip is needed, wrap in tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...buttonProps}>{children}</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * A permission-aware wrapper component that conditionally renders its children based on user permissions
 */
export function WithPermission({
  sectionKey,
  action,
  children,
  fallback = null,
}: Omit<PermissionButtonProps, 'showTooltip' | 'tooltipMessage'>) {
  const { hasPermissionClient } = useAuth();
  const hasPermission = hasPermissionClient(sectionKey, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
} 