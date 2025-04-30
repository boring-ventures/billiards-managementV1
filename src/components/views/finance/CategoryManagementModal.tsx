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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
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

interface CategoryManagementModalProps {
  companyId: string;
  categories: FinanceCategory[];
  onClose: () => void;
  onCategoriesUpdated: (categories: FinanceCategory[]) => void;
}

// Form schema
const categoryFormSchema = z.object({
  name: z.string()
    .min(2, { message: "Category name must be at least 2 characters" })
    .max(50, { message: "Category name cannot exceed 50 characters" }),
  categoryType: z.nativeEnum(FinanceCategoryType, { 
    required_error: "Please select a category type"
  }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function CategoryManagementModal({ 
  companyId, 
  categories, 
  onClose, 
  onCategoriesUpdated 
}: CategoryManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Get income and expense categories
  const incomeCategories = categories.filter(cat => cat.categoryType === "INCOME");
  const expenseCategories = categories.filter(cat => cat.categoryType === "EXPENSE");
  
  // Create form
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      categoryType: activeTab === "income" ? FinanceCategoryType.INCOME : FinanceCategoryType.EXPENSE,
    },
  });
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as "income" | "expense");
    form.setValue(
      "categoryType", 
      value === "income" ? FinanceCategoryType.INCOME : FinanceCategoryType.EXPENSE
    );
  };
  
  // Handle form submission
  const onSubmit = async (data: CategoryFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Prepare category data
      const categoryData = {
        companyId,
        name: data.name,
        categoryType: data.categoryType,
      };
      
      // Create category
      const response = await fetch("/api/finance/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create category");
      }
      
      const newCategory = await response.json();
      
      // Update local categories list
      const updatedCategories = [...categories, newCategory];
      onCategoriesUpdated(updatedCategories);
      
      // Reset form
      form.reset({
        name: "",
        categoryType: data.categoryType,
      });
      
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle category deletion
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setIsDeleting(true);
      
      // Delete category
      const response = await fetch(`/api/finance/categories/${categoryId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        // Check if there's a detailed error message
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete category");
      }
      
      // Update local categories list
      const updatedCategories = categories.filter(cat => cat.id !== categoryId);
      onCategoriesUpdated(updatedCategories);
      
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      let errorMessage = "Failed to delete category. Please try again.";
      
      // Check if error contains a specific message about transactions
      if (error instanceof Error && error.message.includes("transactions")) {
        errorMessage = "Cannot delete a category that has transactions linked to it.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Finance Categories</DialogTitle>
          <DialogDescription>
            Create and manage categories for your financial transactions.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="income" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Income Categories</TabsTrigger>
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="income" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Income Category</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="Enter category name"
                            {...field}
                          />
                        </FormControl>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Creating..." : "Add"}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6">
                        No income categories yet. Create some to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomeCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="expense" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Expense Category</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="Enter category name"
                            {...field}
                          />
                        </FormControl>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Creating..." : "Add"}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6">
                        No expense categories yet. Create some to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenseCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 