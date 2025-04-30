"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface TableDetailPageProps {
  params: {
    id: string;
  };
}

export default function TableDetailPage({ params }: TableDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const { profile, isLoading } = useCurrentUser();
  const [table, setTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isAdmin = hasAdminPermission(profile);

  useEffect(() => {
    async function fetchTable() {
      try {
        const response = await fetch(`/api/tables/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch table");
        }
        const data = await response.json();
        setTable(data);
      } catch (error) {
        console.error("Error fetching table:", error);
        toast({
          title: "Error",
          description: "Failed to load table details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchTable();
    }
  }, [id, toast]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/tables/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete table");
      }

      toast({
        title: "Success",
        description: "Table deleted successfully",
      });

      router.push("/dashboard/tables");
    } catch (error) {
      console.error("Error deleting table:", error);
      toast({
        title: "Error",
        description: "Failed to delete table",
        variant: "destructive",
      });
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="container mx-auto py-6">
        <p>Table not found or could not be loaded.</p>
        <Link href="/dashboard/tables">
          <Button variant="outline" className="mt-4">
            Back to Tables
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{table.name}</h1>
          <p className="text-muted-foreground">Table details and management</p>
        </div>

        <div className="flex space-x-2">
          <Link href="/dashboard/tables" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tables
            </Button>
          </Link>

          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Table Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  table.status === "AVAILABLE"
                    ? "bg-green-100 text-green-800"
                    : table.status === "BUSY"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {table.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Hourly Rate:</span>
              <span>${Number(table.hourlyRate).toFixed(2)}/hour</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Created:</span>
              <span>{new Date(table.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the table
              and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 