"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FinanceCategoryType } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";

// Types
interface FinanceCategory {
  id: string;
  name: string;
  categoryType: FinanceCategoryType;
}

interface AddTransactionModalProps {
  companyId: string;
  categories: FinanceCategory[];
  onClose: () => void;
  onTransactionAdded: (transaction: any) => void;
}

// Form schema
const transactionFormSchema = z.object({
  amount: z.coerce.number()
    .positive({ message: "Amount must be a positive number" }),
  categoryId: z.string({ required_error: "Please select a category" }),
  description: z.string().optional(),
  transactionDate: z.date({ required_error: "Please select a date" }),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function AddTransactionModal({ 
  companyId, 
  categories, 
  onClose, 
  onTransactionAdded 
}: AddTransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Get income and expense categories
  const incomeCategories = categories.filter(cat => cat.categoryType === "INCOME");
  const expenseCategories = categories.filter(cat => cat.categoryType === "EXPENSE");
  
  // Create form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      transactionDate: new Date(),
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: TransactionFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Get category type
      const selectedCategory = categories.find(cat => cat.id === data.categoryId);
      if (!selectedCategory) {
        throw new Error("Invalid category selected");
      }
      
      // Check current user profile first to determine if companyId needs to be passed
      const userProfileResponse = await fetch("/api/profile");
      const userProfileData = await userProfileResponse.json();
      const userProfile = userProfileData?.profile;
      
      // Prepare transaction data
      const transactionData: Record<string, any> = {
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description || null,
        transactionDate: data.transactionDate,
      };
      
      // Only add companyId directly if not a superadmin, otherwise get it from query or profile
      if (userProfile?.role === "SUPERADMIN") {
        // If superadmin with a selected company, use that company
        if (userProfile.companyId) {
          transactionData.companyId = userProfile.companyId;
        } else if (companyId) {
          // Use the companyId passed to the component
          transactionData.companyId = companyId;
        }
      } else {
        // Regular users always use their assigned company
        transactionData.companyId = companyId;
      }
      
      // Create transaction
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create transaction");
      }
      
      const newTransaction = await response.json();
      
      // Add category details to returned transaction for UI update
      newTransaction.category = selectedCategory;
      
      // Notify parent component
      onTransactionAdded(newTransaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get selected category type
  const selectedCategoryId = form.watch("categoryId");
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const transactionType = selectedCategory?.categoryType;
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Record a new financial transaction for your business.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Transaction Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={cn(
                  "border rounded-md p-4 cursor-pointer text-center",
                  transactionType === "INCOME" 
                    ? "border-green-500 bg-green-50" 
                    : "hover:border-gray-400"
                )}
                onClick={() => {
                  if (incomeCategories.length > 0) {
                    form.setValue("categoryId", incomeCategories[0].id);
                  }
                }}
              >
                <p className="font-medium">Income</p>
                <p className="text-sm text-muted-foreground">
                  {incomeCategories.length} categories
                </p>
              </div>
              
              <div 
                className={cn(
                  "border rounded-md p-4 cursor-pointer text-center",
                  transactionType === "EXPENSE" 
                    ? "border-red-500 bg-red-50" 
                    : "hover:border-gray-400"
                )}
                onClick={() => {
                  if (expenseCategories.length > 0) {
                    form.setValue("categoryId", expenseCategories[0].id);
                  }
                }}
              >
                <p className="font-medium">Expense</p>
                <p className="text-sm text-muted-foreground">
                  {expenseCategories.length} categories
                </p>
              </div>
            </div>
            
            {/* Category Selection */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionType === "INCOME" ? (
                        incomeCategories.length > 0 ? (
                          incomeCategories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No income categories available
                          </SelectItem>
                        )
                      ) : transactionType === "EXPENSE" ? (
                        expenseCategories.length > 0 ? (
                          expenseCategories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No expense categories available
                          </SelectItem>
                        )
                      ) : (
                        <SelectItem value="none" disabled>
                          Select a transaction type first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Transaction Date */}
            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter additional details about this transaction"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedCategoryId}>
                {isSubmitting ? "Creating..." : "Create Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 