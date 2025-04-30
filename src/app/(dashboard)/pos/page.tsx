"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/context/company-context";
import { UserRole } from "@prisma/client";
import { Loader2, Search, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

// Type definitions
type InventoryItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  companyId: string;
};

type CartItem = {
  inventoryItemId: string;
  name: string;
  price: number;
  quantity: number;
};

export default function PosPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useCurrentUser();
  const { selectedCompanyId } = useCompany();
  const companyId = profile?.role === UserRole.SUPERADMIN ? selectedCompanyId : profile?.companyId;

  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableSessionId, setTableSessionId] = useState<string | null>(null);
  const [tableSessionList, setTableSessionList] = useState<{ id: string; tableName: string }[]>([]);

  useEffect(() => {
    if (!profileLoading) {
      // No profile, redirect to login
      if (!profile) {
        router.push("/sign-in");
        return;
      }

      // Superadmin without selected company - go to company selection
      if (profile.role === UserRole.SUPERADMIN && !selectedCompanyId) {
        router.push("/company-selection");
        return;
      }

      // Regular user without a company - go to waiting page
      if (profile.role !== UserRole.SUPERADMIN && !profile.companyId) {
        router.push("/waiting-approval");
        return;
      }

      // Only admin and superadmin should access this page
      if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPERADMIN) {
        router.push("/dashboard");
        return;
      }

      // Fetch inventory items
      fetchInventoryItems();
      
      // Fetch active table sessions
      fetchTableSessions();
    }
  }, [profile, profileLoading, router, selectedCompanyId]);

  useEffect(() => {
    if (inventoryItems.length) {
      setFilteredItems(
        searchTerm
          ? inventoryItems.filter(item =>
              item.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : inventoryItems
      );
    }
  }, [searchTerm, inventoryItems]);

  const fetchInventoryItems = async () => {
    try {
      setIsLoading(true);
      // Fetch inventory items from the API
      const response = await fetch(`/api/inventory?companyId=${companyId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch inventory items");
      }
      
      const data = await response.json();
      setInventoryItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableSessions = async () => {
    try {
      // Fetch active table sessions
      const response = await fetch(`/api/tables/sessions/active?companyId=${companyId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch table sessions");
      }
      
      const data = await response.json();
      setTableSessionList(data);
    } catch (error) {
      console.error("Error fetching table sessions:", error);
    }
  };

  const addToCart = (item: InventoryItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.inventoryItemId === item.id);
      
      if (existingItem) {
        // Update quantity of existing item
        return prevCart.map(cartItem => 
          cartItem.inventoryItemId === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // Add new item to cart
        return [...prevCart, {
          inventoryItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1
        }];
      }
    });
  };

  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item from cart if quantity is zero or negative
      setCart(prevCart => prevCart.filter((_, i) => i !== index));
    } else {
      // Update quantity
      setCart(prevCart => 
        prevCart.map((item, i) => 
          i === index ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeCartItem = (index: number) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderData = {
        companyId,
        tableSessionId: tableSessionId || undefined,
        items: cart,
        total: calculateTotal(),
        staffId: profile?.id
      };

      const response = await fetch("/api/pos/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Order created successfully",
      });

      // Clear cart
      setCart([]);
      
      // Navigate to order details
      router.push(`/dashboard/pos/orders/${data.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    }
  };

  if (profileLoading || isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container p-6">
      <h1 className="text-2xl font-bold mb-6">Point of Sale</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inventory Section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search inventory..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4" onClick={() => addToCart(item)}>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ${item.price.toFixed(2)} • {item.stock} in stock
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredItems.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    {searchTerm ? "No items match your search" : "No inventory items available"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
              </CardTitle>
              
              {tableSessionList.length > 0 && (
                <div className="mt-2">
                  <select
                    className="w-full p-2 border rounded"
                    value={tableSessionId || ""}
                    onChange={(e) => setTableSessionId(e.target.value || null)}
                  >
                    <option value="">No table (direct sale)</option>
                    {tableSessionList.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.tableName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="flex-grow overflow-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cart is empty
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.map((item, index) => (
                    <li key={index} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-5 text-center">{item.quantity}</span>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeCartItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            
            <CardFooter className="border-t p-4">
              <div className="w-full">
                <div className="flex justify-between mb-4">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={cart.length === 0}
                  onClick={submitOrder}
                >
                  Complete Order
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 