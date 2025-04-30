"use client";

import * as React from 'react';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, ChevronsUpDown, Plus, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCompany } from "@/context/company-context";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";

interface Company {
  id: string;
  name: string;
}

export function CompanyTeamSwitcher() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { profile } = useCurrentUser();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  useEffect(() => {
    // Only fetch for superadmins
    if (profile?.role !== UserRole.SUPERADMIN) return;

    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        const data = await response.json();
        setCompanies(data.companies || []);
        
        // Find the currently selected company
        if (selectedCompanyId && data.companies?.length > 0) {
          const current = data.companies.find((c: Company) => c.id === selectedCompanyId);
          if (current) {
            setActiveCompany(current);
          }
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      }
    };

    fetchCompanies();
  }, [selectedCompanyId, profile]);

  const handleSelect = (company: Company) => {
    setActiveCompany(company);
    setSelectedCompanyId(company.id);
  };

  const handleAddNewCompany = () => {
    router.push("/companies/new");
  };

  const handleViewAllCompanies = () => {
    router.push("/company-selection");
  };

  // Only show for superadmins
  if (profile?.role !== UserRole.SUPERADMIN) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <Building className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {activeCompany?.name || "Select Workspace"}
                </span>
                <span className='truncate text-xs'>
                  {activeCompany ? "Active Workspace" : "No workspace selected"}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Workspaces
            </DropdownMenuLabel>
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => handleSelect(company)}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <Building className='size-4 shrink-0' />
                </div>
                {company.name}
                {selectedCompanyId === company.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className='gap-2 p-2'
              onClick={handleAddNewCompany}
            >
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>Add workspace</div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className='gap-2 p-2'
              onClick={handleViewAllCompanies}
            >
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Building className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>View all workspaces</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
} 