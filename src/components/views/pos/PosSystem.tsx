"use client";

import { useState, useEffect } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Trash2, Search, ShoppingCart, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import OrderHistory from "./OrderHistory";
import { PosCart } from "./PosCart";
import { ProductGrid } from "./ProductGrid";

interface InventoryItem {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
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

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PosSystemProps {
  companyId: string;
  profile: any;
}

export function PosSystem({ companyId, profile }: PosSystemProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("products");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeTableSession, setActiveTableSession] = useState<string | null>(null);
  const [tableSessions, setTableSessions] = useState<any[]>([]);
  
  // Fetch inventory items, categories, and active table sessions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch inventory items
        const itemsResponse = await fetch(`/api/inventory?companyId=${companyId}`);
        if (!itemsResponse.ok) throw new Error("Failed to fetch inventory items");
        const itemsData = await itemsResponse.json();
        
        // Filter out items with no price or zero quantity
        const availableItems = itemsData.filter((item: InventoryItem) => 
          item.price !== null && item.quantity > 0
        );
        
        setInventoryItems(availableItems);
        setFilteredItems(availableItems);
        
        // Fetch categories
        const categoriesResponse = await fetch(`/api/inventory/categories?companyId=${companyId}`);
        if (!categoriesResponse.ok) throw new Error("Failed to fetch categories");
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        
        // Fetch active table sessions
        const tablesResponse = await fetch(`/api/tables/sessions/active?companyId=${companyId}`);
        if (tablesResponse.ok) {
          const tablesData = await tablesResponse.json();
          setTableSessions(tablesData);
        }
      } catch (error) {
        console.error("Error fetching POS data:", error);
        toast({
          title: "Error",
          description: "Failed to load inventory data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (companyId) {
      fetchData();
    }
  }, [companyId, toast]);
  
  // Filter products based on search and category
  useEffect(() => {
    if (!inventoryItems.length) return;
    
    const filtered = inventoryItems.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = selectedCategory === "all" || 
        item.categoryId === selectedCategory;
        
      return matchesSearch && matchesCategory;
    });
    
    setFilteredItems(filtered);
  }, [searchTerm, selectedCategory, inventoryItems]);
  
  // Add item to cart
  const addToCart = (item: InventoryItem) => {
    if (!item.price) return;
    
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // Don't exceed available quantity
      if (existingItem.quantity >= item.quantity) {
        toast({
          title: "Cannot add more",
          description: `Only ${item.quantity} available in stock`,
          variant: "destructive",
        });
        return;
      }
      
      setCartItems(prevItems => 
        prevItems.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        )
      );
    } else {
      setCartItems(prevItems => [
        ...prevItems, 
        { 
          id: item.id, 
          name: item.name, 
          price: item.price as number,
          quantity: 1 
        }
      ]);
    }
    
    toast({
      title: "Added to cart",
      description: `${item.name} added to cart`,
    });
  };
  
  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };
  
  // Update item quantity in cart
  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    // Find the inventory item to check stock
    const inventoryItem = inventoryItems.find(item => item.id === itemId);
    
    if (inventoryItem && newQuantity > inventoryItem.quantity) {
      toast({
        title: "Cannot add more",
        description: `Only ${inventoryItem.quantity} available in stock`,
        variant: "destructive",
      });
      return;
    }
    
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };
  
  // Calculate total
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  
  // Process order
  const processOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to the cart before checking out",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          tableSessionId: activeTableSession,
          staffId: profile.id,
          items: cartItems.map(item => ({
            inventoryItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          total: cartTotal,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to process order");
      }
      
      const order = await response.json();
      
      toast({
        title: "Order Completed",
        description: `Order #${order.orderNumber} has been processed successfully`,
      });
      
      // Clear cart
      setCartItems([]);
      
      // Refresh inventory to update stock levels
      const refreshInventory = async () => {
        const itemsResponse = await fetch(`/api/inventory?companyId=${companyId}`);
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          const availableItems = itemsData.filter((item: InventoryItem) => 
            item.price !== null && item.quantity > 0
          );
          setInventoryItems(availableItems);
          setFilteredItems(availableItems);
        }
      };
      
      refreshInventory();
      
      // Switch to orders tab to show the new order
      setActiveTab("orders");
      
    } catch (error) {
      console.error("Error processing order:", error);
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading POS system...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Main POS area - Products and Checkout */}
      <div className="md:col-span-2 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          
          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
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
              
              {tableSessions.length > 0 && (
                <Select
                  value={activeTableSession || ""}
                  onValueChange={setActiveTableSession}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Assign to table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No table</SelectItem>
                    {tableSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <ProductGrid 
              items={filteredItems} 
              onAddToCart={addToCart} 
            />
          </TabsContent>
          
          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrderHistory companyId={companyId} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Cart */}
      <div className="md:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Cart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PosCart
              items={cartItems}
              onRemove={removeFromCart}
              onUpdateQuantity={updateCartItemQuantity}
              inventoryItems={inventoryItems}
            />
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="text-lg font-medium">Total:</span>
              <span className="text-lg font-bold">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              disabled={cartItems.length === 0}
              onClick={processOrder}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Complete Sale
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 