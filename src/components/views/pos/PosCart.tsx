"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventoryItem {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PosCartProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  inventoryItems: InventoryItem[];
}

export function PosCart({ items, onRemove, onUpdateQuantity, inventoryItems }: PosCartProps) {
  // Get the available stock for an item
  const getAvailableStock = (itemId: string): number => {
    const item = inventoryItems.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Cart is empty</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add products to get started
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-24rem)]">
      <div className="space-y-4">
        {items.map((item) => {
          const lineTotal = item.price * item.quantity;
          const availableStock = getAvailableStock(item.id);
          
          return (
            <div key={item.id} className="pb-4 last:pb-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="h-8 w-8"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="h-8 w-8"
                    disabled={item.quantity >= availableStock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-semibold">${lineTotal.toFixed(2)}</span>
              </div>
              
              <Separator className="mt-4" />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
} 