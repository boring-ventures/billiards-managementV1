"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

// Transaction schema for validation
const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(500, "Description is too long"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

// Default values for the form
const defaultValues: Partial<TransactionFormValues> = {
  type: "INCOME",
  date: new Date().toISOString().split("T")[0],
};

interface NewTransactionFormProps {
  onSuccess?: () => void;
}

export function NewTransactionForm({ onSuccess }: NewTransactionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with validation schema
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  // Handle form submission
  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);
    
    try {
      const supabase = createClient();
      
      // Insert the transaction into the database
      const { error } = await supabase
        .from("transactions")
        .insert({
          amount: values.type === "EXPENSE" ? -Math.abs(values.amount) : Math.abs(values.amount),
          transaction_type: values.type,
          category: values.category,
          description: values.description,
          transaction_date: values.date,
        });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Transaction created",
        description: "Your transaction has been saved successfully.",
      });
      
      // Reset form
      form.reset(defaultValues);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      
      toast({
        title: "Error creating transaction",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Transaction type field */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category field */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sales, Equipment, Utilities" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date field */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description field - full width */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter transaction details" 
                  className="h-24"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => form.reset(defaultValues)}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 