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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

// Form validation schema
const maintenanceFormSchema = z.object({
  description: z.string().min(5, "Description must be at least 5 characters"),
  maintenanceAt: z.date({
    required_error: "Please select a date and time",
  }),
  estimatedCost: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    {
      message: "Cost must be a positive number",
    }
  ),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

interface ScheduleMaintenanceFormProps {
  tableId: string;
  tableName: string;
  companyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ScheduleMaintenanceForm({
  tableId,
  tableName,
  companyId,
  onSuccess,
  onCancel,
}: ScheduleMaintenanceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      description: "",
      maintenanceAt: new Date(),
      estimatedCost: "",
    },
  });
  
  // Submit handler
  const onSubmit = async (data: MaintenanceFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Convert estimatedCost to a number
      const cost = parseFloat(data.estimatedCost);
      
      const response = await fetch("/api/tables/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId,
          companyId,
          description: data.description,
          maintenanceAt: data.maintenanceAt.toISOString(),
          cost,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to schedule maintenance");
      }
      
      // Handle success
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error scheduling maintenance:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-6 bg-card border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Schedule Maintenance for {tableName}</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe the maintenance to be performed" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Provide details about the maintenance required
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="maintenanceAt"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Maintenance Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select the date when maintenance will be performed
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="estimatedCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Estimated cost of the maintenance
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
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Maintenance"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 