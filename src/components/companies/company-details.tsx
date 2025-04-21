"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building,
  MapPin,
  Phone,
  Calendar,
  Users,
  Briefcase,
  ChevronLeft,
  Edit,
  Trash,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCompany } from "@/hooks/use-company";
import { useCompanies } from "@/hooks/use-companies";
import { format } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyForm } from "@/components/forms/company-form";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface CompanyDetailsProps {
  companyId: string;
}

function CompanyDetailsSkeleton() {
  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-40 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-full max-w-md" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </div>

              <div>
                <Skeleton className="h-5 w-20 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-56" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompanyDetails({ companyId }: CompanyDetailsProps) {
  const { company, isLoading, fetchCompany } = useCompany(companyId);
  const { deleteCompany } = useCompanies();
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  if (isLoading) {
    return <CompanyDetailsSkeleton />;
  }

  if (!company) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[400px] flex flex-col items-center justify-center p-8"
      >
        <div className="text-center mb-6">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            Company not found or has been deleted.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/companies">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </Button>
      </motion.div>
    );
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCompany(companyId);
      router.push("/companies");
    } catch (error) {
      console.error("Error deleting company:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchCompany();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 p-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/companies">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Link>
          </Button>

          <div className="flex items-center text-muted-foreground gap-1.5">
            <span className="text-xs font-medium">ID:</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {company.id}
            </code>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Company
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the company "{company.name}" and
                  all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-card border rounded-lg p-6"
      >
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Building className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">{company.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Company Details</p>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/companies/${company.id}/tables`}>
                  <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                  Tables
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/companies/${company.id}/staff`}>
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Staff
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/companies/${company.id}/finances`}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Finances
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Contact Information
                </h3>
                <Separator className="mb-3" />
                <div className="space-y-2">
                  {company.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2 mt-0.5" />
                      <div className="text-sm">{company.address}</div>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                      <div className="text-sm">{company.phone}</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Details
                </h3>
                <Separator className="mb-3" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-sm">
                      Created on {format(new Date(company.createdAt), "PPP")}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Resources
                </h3>
                <Separator className="mb-3" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-sm">
                      <span className="font-medium">
                        {company._count?.profiles || 0}
                      </span>{" "}
                      staff members
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 text-muted-foreground mr-2" />
                    <div className="text-sm">
                      <span className="font-medium">
                        {company._count?.tables || 0}
                      </span>{" "}
                      tables
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update details for {company.name}
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            initialData={{
              id: company.id,
              name: company.name,
              address: company.address,
              phone: company.phone,
            }}
            onSuccess={handleEditSuccess}
            isDialog={true}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
