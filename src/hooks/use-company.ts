import { useCallback, useState } from "react";
import { useToastExtended } from "@/components/ui/use-toast";

interface Company {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  _count?: {
    profiles: number;
    tables: number;
    inventoryItems: number;
  };
}

export function useCompany(id?: string) {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToastExtended();

  const fetchCompany = useCallback(
    async (companyId: string = id!) => {
      if (!companyId) return null;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch company");
        }

        const data = await response.json();
        setCompany(data);
        return data;
      } catch (error) {
        toast.error("Failed to load company");
        console.error("Error fetching company:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [id]
  );

  return {
    company,
    isLoading,
    fetchCompany,
  };
}
