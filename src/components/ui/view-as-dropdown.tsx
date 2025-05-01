"use client";

import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { EyeIcon, UserIcon, ShieldIcon, AlertTriangleIcon } from 'lucide-react';
import { useViewMode } from '@/context/view-mode-context';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ViewAsDropdown() {
  const { profile } = useCurrentUser();
  const { viewMode, setViewMode, resetViewMode, canAccessViewMode, actualRole } = useViewMode();
  
  // Only superadmins can access this feature
  if (!canAccessViewMode) {
    return null;
  }

  // Get role display name
  const getRoleDisplay = (role: UserRole | null) => {
    if (!role) return 'Your Role (Superadmin)';
    
    return role
      .toString()
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get icon for each role
  const getRoleIcon = (role: UserRole | null) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return <ShieldIcon className="h-4 w-4 mr-2 text-purple-500" />;
      case UserRole.ADMIN:
        return <ShieldIcon className="h-4 w-4 mr-2 text-blue-500" />;
      case UserRole.SELLER:
      case UserRole.USER:
        return <UserIcon className="h-4 w-4 mr-2 text-green-500" />;
      default:
        return <ShieldIcon className="h-4 w-4 mr-2 text-purple-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-1 px-2">
          <EyeIcon className="h-4 w-4" />
          <span className="hidden sm:inline">View As</span>
          {viewMode && (
            <Badge variant="outline" className="ml-1 px-1">
              {getRoleDisplay(viewMode)}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Role Simulation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Reset to actual role */}
        <DropdownMenuItem 
          onClick={() => resetViewMode()}
          className={!viewMode ? "bg-accent text-accent-foreground" : ""}
        >
          {getRoleIcon(null)}
          <span>Your Role (Superadmin)</span>
        </DropdownMenuItem>
        
        {/* Admin role */}
        <DropdownMenuItem 
          onClick={() => setViewMode(UserRole.ADMIN)}
          className={viewMode === UserRole.ADMIN ? "bg-accent text-accent-foreground" : ""}
        >
          {getRoleIcon(UserRole.ADMIN)}
          <span>Admin</span>
        </DropdownMenuItem>
        
        {/* Staff role */}
        <DropdownMenuItem 
          onClick={() => setViewMode(UserRole.SELLER)}
          className={viewMode === UserRole.SELLER ? "bg-accent text-accent-foreground" : ""}
        >
          {getRoleIcon(UserRole.SELLER)}
          <span>Staff</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {viewMode && (
          <div className="p-2 text-xs text-muted-foreground">
            <AlertTriangleIcon className="h-3 w-3 inline-block mr-1" />
            <span>You are viewing as {getRoleDisplay(viewMode)}</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 