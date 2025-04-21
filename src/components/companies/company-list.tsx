"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building,
  Edit,
  Eye,
  MoreHorizontal,
  Trash,
  Search,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanies } from "@/hooks/use-companies";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { CompanyForm } from "@/components/forms/company-form";
import { Input } from "@/components/ui/input";

interface Company {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
}

export function CompanyList() {
  const { companies, isLoading, fetchCompanies, deleteCompany } =
    useCompanies();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleEditClick = (company: Company) => {
    setEditCompany(company);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditCompany(null);
    fetchCompanies();
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    fetchCompanies();
  };

  const handleBulkDelete = async () => {
    if (selectedCompanies.length === 0) return;

    // Delete each selected company
    for (const company of selectedCompanies) {
      await deleteCompany(company.id);
    }

    // Clear selection and refresh
    setSelectedCompanies([]);
    fetchCompanies();
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "name",
      header: "Company Name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <Link
            href={`/companies/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }: any) => row.original.phone || "-",
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: any) => {
        const date = new Date(row.original.createdAt);
        return (
          <div
            className="text-sm text-muted-foreground"
            title={format(date, "PPP")}
          >
            {formatDistanceToNow(date, { addSuffix: true })}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const company = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/companies/${company.id}`)}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditClick(company)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the company "{company.name}"
                    and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await deleteCompany(company.id);
                      fetchCompanies();
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  // Filter data for search
  const filteredData =
    searchTerm.trim() === ""
      ? companies
      : companies.filter((company) =>
          company.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 w-full max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCompanies.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedCompanies.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedCompanies.length}{" "}
                    selected{" "}
                    {selectedCompanies.length === 1 ? "company" : "companies"}
                    and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        enableRowSelection={true}
        onRowSelection={setSelectedCompanies}
      />

      {/* Create Company Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Create a new billiards company or venue.
            </DialogDescription>
          </DialogHeader>
          <CompanyForm onSuccess={handleCreateSuccess} isDialog={true} />
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update details for {editCompany?.name}
            </DialogDescription>
          </DialogHeader>
          {editCompany && (
            <CompanyForm
              initialData={{
                id: editCompany.id,
                name: editCompany.name,
                address: editCompany.address,
                phone: editCompany.phone,
              }}
              onSuccess={handleEditSuccess}
              isDialog={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
