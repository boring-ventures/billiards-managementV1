"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle } from "lucide-react";

interface InventoryCategory {
  id: string;
  name: string;
}

interface InventoryFormProps {
  companyId: string;
  itemId?: string;
}

// Define validation schema for inventory item
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity can't be negative"),
  criticalThreshold: z.coerce.number().min(0, "Threshold can't be negative"),
  price: z.coerce.number().min(0, "Price can't be negative").optional(),
});

export default function InventoryForm({ companyId, itemId }: InventoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId: undefined,
      sku: "",
      quantity: 0,
      criticalThreshold: 5,
      price: undefined,
    },
  });

  // Fetch categories and item data (if editing)
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch categories
        const categoriesRes = await fetch(`/api/inventory/categories?companyId=${companyId}`);
        if (!categoriesRes.ok) throw new Error("Failed to fetch categories");
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);

        // If editing existing item, fetch its data
        if (itemId) {
          const itemRes = await fetch(`/api/inventory/${itemId}`);
          if (!itemRes.ok) throw new Error("Failed to fetch item");
          const itemData = await itemRes.json();
          
          // Set form values
          form.reset({
            name: itemData.name,
            categoryId: itemData.categoryId || undefined,
            sku: itemData.sku || "",
            quantity: itemData.quantity,
            criticalThreshold: itemData.criticalThreshold,
            price: itemData.price || undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [companyId, itemId, form, toast]);

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const url = itemId 
        ? `/api/inventory/${itemId}` 
        : `/api/inventory`;
      
      const method = itemId ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          companyId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save inventory item");
      }

      toast({
        title: "Success",
        description: `Inventory item ${itemId ? "updated" : "created"} successfully`,
      });

      // Navigate back to inventory list
      router.push("/inventory");
      router.refresh();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        title: "Error",
        description: "Failed to save inventory item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle new category creation
  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    
    try {
      setIsLoading(true);
      const response = await fetch("/api/inventory/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName,
          companyId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create category");
      }

      const newCategory = await response.json();
      
      // Add to categories list and select it
      setCategories([...categories, newCategory]);
      form.setValue("categoryId", newCategory.id);
      
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      
      // Close dialog and reset input
      setOpenCategoryDialog(false);
      setNewCategoryName("");
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <Dialog open={openCategoryDialog} onOpenChange={setOpenCategoryDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          className="flex-shrink-0"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Category</DialogTitle>
                          <DialogDescription>
                            Add a new category for inventory items
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                              <Input
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder="Enter category name"
                              />
                            </FormControl>
                          </FormItem>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpenCategoryDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim() || isLoading}
                          >
                            Create Category
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <FormDescription>
                    Select a category or create a new one
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SKU */}
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter SKU code" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for the item
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="0"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Current stock quantity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Critical Threshold */}
            <FormField
              control={form.control}
              name="criticalThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Stock Threshold</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="5"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Alerts will show when quantity falls below this number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Selling price per unit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/inventory")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : itemId ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 