"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasAdminPermission } from "@/lib/rbac";
import { Table } from "@prisma/client";

// Form validation schema
const tableFormSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  hourlyRate: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    {
      message: "Hourly rate must be a positive number",
    }
  ),
  status: z.string(),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

export default function EditTablePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [table, setTable] = useState<Table | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  
  // Form initialization
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      hourlyRate: "",
      status: "AVAILABLE",
    },
  });
  
  // Fetch table data
  useEffect(() => {
    const fetchTable = async () => {
      try {
        const response = await fetch(`/api/tables/${params.id}`);
        if (!response.ok) throw new Error("Failed to fetch table");
        
        const data = await response.json();
        setTable(data.table);
        
        // Check if there's an active session
        const activeSession = data.table.sessions && data.table.sessions.length > 0;
        setHasActiveSession(activeSession);
        
        // Update form values
        form.reset({
          name: data.table.name,
          hourlyRate: data.table.hourlyRate.toString(),
          status: data.table.status || "AVAILABLE",
        });
      } catch (error) {
        console.error("Error fetching table:", error);
      }
    };
    
    if (params.id) {
      fetchTable();
    }
  }, [params.id, form]);
  
  // Check if user has admin permissions
  useEffect(() => {
    if (!isLoading && !hasAdminPermission(profile)) {
      router.push("/tables");
    }
  }, [isLoading, profile, router]);

  // Submit handler
  const onSubmit = async (data: TableFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Convert hourlyRate to a number
      const hourlyRate = parseFloat(data.hourlyRate);
      
      const response = await fetch(`/api/tables/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          hourlyRate,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update table");
      }
      
      // Redirect to tables list
      router.push("/tables");
      router.refresh();
    } catch (error) {
      console.error("Error updating table:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Table</h1>
          <p className="text-muted-foreground">
            Update table information
          </p>
        </div>
        
        <Link href="/tables" passHref>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Tables
          </Button>
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="p-6 bg-card border rounded-lg shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Table 1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a descriptive name for the table
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="15.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The hourly rate charged for this table
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={hasActiveSession}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select table status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {hasActiveSession 
                        ? "Status cannot be changed while there is an active session" 
                        : "The current status of the table"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="mr-2"
                  onClick={() => router.push("/tables")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Table"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
} 