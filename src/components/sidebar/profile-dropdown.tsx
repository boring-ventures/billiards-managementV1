"use client";

import Link from "next/link";
import { BadgeCheck, LogOut, Settings, User, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { useCompany } from "@/context/company-context";
import { useState, useEffect } from "react";

interface Company {
  id: string;
  name: string;
}

export function ProfileDropdown() {
  const { profile, user, isLoading } = useCurrentUser();
  const { isSuperadmin, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  useEffect(() => {
    // For superadmins, fetch the current company name
    if (isSuperadmin && selectedCompanyId) {
      const fetchCompanyDetails = async () => {
        try {
          const response = await fetch(`/api/companies/${selectedCompanyId}`);
          if (response.ok) {
            const data = await response.json();
            setCurrentCompany(data.company);
          }
        } catch (error) {
          console.error("Failed to fetch company details:", error);
        }
      };
      
      fetchCompanyDetails();
    }
  }, [isSuperadmin, selectedCompanyId]);

  if (isLoading) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
      </Button>
    );
  }

  if (!profile || !user) return null;

  const displayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile.firstName || profile.lastName) {
      return [profile.firstName?.[0], profile.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "U";
  };

  // Get role display name
  const getRoleDisplay = (role: UserRole) => {
    return role
      .toString()
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleSwitchCompany = () => {
    // Clear selected company and redirect to company selection
    setSelectedCompanyId(null);
    window.location.href = "/company-selection";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8 ring-2 ring-primary/10">
            <AvatarImage
              src={profile.avatarUrl || ""}
              alt={displayName || user.email || "User"}
            />
            <AvatarFallback className="bg-primary/10">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {displayName || user.email?.split("@")[0]}
              </p>
              <Badge variant="outline" className="ml-2 text-xs">
                {getRoleDisplay(profile.role)}
              </Badge>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {isSuperadmin && currentCompany && (
              <p className="text-xs mt-1 flex items-center text-primary">
                <Building className="h-3 w-3 mr-1" />
                {currentCompany.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          {profile.role === UserRole.SUPERADMIN && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchCompany}>
                <Building className="mr-2 h-4 w-4" />
                Switch Workspace
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await fetch("/api/auth/signout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
