"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCompany } from "@/context/company-context";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";

interface Company {
  id: string;
  name: string;
}

export function CompanySwitcher() {
  const router = useRouter();
  const { profile } = useCurrentUser();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);

  // Only show this component for superadmins
  if (profile?.role !== UserRole.SUPERADMIN) {
    return null;
  }

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        const data = await response.json();
        setCompanies(data.companies || []);
        
        // Find the currently selected company
        if (selectedCompanyId && data.companies?.length > 0) {
          const current = data.companies.find((c: Company) => c.id === selectedCompanyId);
          if (current) {
            setSelected(current);
          }
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      }
    };

    fetchCompanies();
  }, [selectedCompanyId]);

  const handleSelect = (company: Company) => {
    setSelected(company);
    setSelectedCompanyId(company.id);
    setOpen(false);
  };

  const handleSwitchWorkspace = () => {
    router.push("/company-selection");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex justify-between w-52"
        >
          <div className="flex items-center gap-2 text-sm font-medium truncate">
            <Building className="h-4 w-4" />
            {selected?.name || "Select company"}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0">
        <Command>
          <CommandInput placeholder="Search company..." />
          <CommandEmpty>No company found.</CommandEmpty>
          <CommandGroup>
            {companies.map((company) => (
              <CommandItem
                key={company.id}
                value={company.name}
                onSelect={() => handleSelect(company)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCompanyId === company.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{company.name}</span>
              </CommandItem>
            ))}
            <CommandItem 
              className="border-t mt-1 pt-1 text-primary font-medium" 
              onSelect={handleSwitchWorkspace}
            >
              Switch Workspace
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 