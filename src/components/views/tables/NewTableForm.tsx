"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { getActiveCompanyId } from "@/lib/authUtils";

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
  status: z.string().default("AVAILABLE"),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

export function NewTableForm() {
  const router = useRouter();
  const { profile } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      hourlyRate: "",
      status: "AVAILABLE",
    },
  });
  
  // Submit handler
  const onSubmit = async (data: TableFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Get companyId from profile or localStorage for superadmins
      let companyId = profile?.companyId;
      
      // For superadmins, get selected company from localStorage
      if (profile?.role === "SUPERADMIN" && typeof window !== 'undefined') {
        const selectedCompanyId = localStorage.getItem('selectedCompanyId');
        if (selectedCompanyId) {
          companyId = selectedCompanyId;
        }
      }
      
      if (!companyId) {
        throw new Error("No company selected");
      }
      
      // Convert hourlyRate to a number
      const hourlyRate = parseFloat(data.hourlyRate);
      
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          companyId,
          hourlyRate,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create table");
      }
      
      // Redirect to tables list
      router.push("/dashboard/tables");
      router.refresh();
    } catch (error) {
      console.error("Error creating table:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
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
                  The initial status of the table
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
              onClick={() => router.push("/dashboard/tables")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Table"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 