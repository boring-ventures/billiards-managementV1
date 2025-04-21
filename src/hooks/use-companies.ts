import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToastExtended } from "@/components/ui/use-toast";

interface Company {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToastExtended();

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/companies");

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();
      setCompanies(data);
      return data;
    } catch (error) {
      toast.error("Failed to load companies");
      console.error("Error fetching companies:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCompany = useCallback(
    async (data: Omit<Company, "id" | "createdAt">) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create company");
        }

        const newCompany = await response.json();
        toast.success("Company created successfully");
        router.refresh();
        return newCompany;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create company"
        );
        console.error("Error creating company:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast]
  );

  const updateCompany = useCallback(
    async (id: string, data: Partial<Omit<Company, "id" | "createdAt">>) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update company");
        }

        const updatedCompany = await response.json();
        toast.success("Company updated successfully");
        router.refresh();
        return updatedCompany;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update company"
        );
        console.error("Error updating company:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast]
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete company");
        }

        toast.success("Company deleted successfully");
        router.refresh();
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete company"
        );
        console.error("Error deleting company:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast]
  );

  return {
    companies,
    isLoading,
    fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
