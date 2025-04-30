"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import Link from "next/link";
import prisma from "@/lib/prisma";
import { useRouter } from "next/navigation";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  criticalThreshold: number;
  price: number | null;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
}

interface InventoryCategory {
  id: string;
  name: string;
}

interface InventoryListProps {
  adminView: boolean;
  companyId: string;
}

export function InventoryList({ adminView, companyId }: InventoryListProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  // Fetch inventory items and categories
  useEffect(() => {
    async function fetchInventoryData() {
      try {
        setLoading(true);
        // Fetch inventory items
        const itemsResponse = await fetch(`/api/inventory?companyId=${companyId}`);
        if (!itemsResponse.ok) throw new Error("Failed to fetch inventory items");
        const itemsData = await itemsResponse.json();
        
        // Fetch categories
        const categoriesResponse = await fetch(`/api/inventory/categories?companyId=${companyId}`);
        if (!categoriesResponse.ok) throw new Error("Failed to fetch categories");
        const categoriesData = await categoriesResponse.json();
        
        setInventoryItems(itemsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        toast({
          title: "Error",
          description: "Failed to load inventory data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    if (companyId) {
      fetchInventoryData();
    }
  }, [companyId, toast]);

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      const response = await fetch(`/api/inventory/${itemToDelete}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete item");
      }
      
      // Remove item from state
      setInventoryItems(items => items.filter(item => item.id !== itemToDelete));
      
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete inventory item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setItemToDelete(null);
      setOpenDeleteDialog(false);
    }
  };

  // Filter items based on search term and selected category
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = 
      selectedCategory === "all" || 
      item.categoryId === selectedCategory;
      
    return matchesSearch && matchesCategory;
  });

  // Check if item has critical stock level
  const hasLowStock = (item: InventoryItem) => {
    return item.quantity <= item.criticalThreshold;
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between pb-4">
        <Input
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Status</TableHead>
              {adminView && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={adminView ? 7 : 6} className="text-center py-10">
                  Loading inventory data...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={adminView ? 7 : 6} className="text-center py-10">
                  No inventory items found. {adminView && "Add new items to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category?.name || "Uncategorized"}</TableCell>
                  <TableCell>{item.sku || "-"}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {item.price ? `$${item.price.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasLowStock(item) ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge variant="outline">In Stock</Badge>
                    )}
                  </TableCell>
                  {adminView && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/inventory/${item.id}`} passHref>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem 
                            onClick={() => {
                              setItemToDelete(item.id);
                              setOpenDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inventory item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 