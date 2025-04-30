"use client";

import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface ProductGridProps {
  items: InventoryItem[];
  onAddToCart: (item: InventoryItem) => void;
}

export function ProductGrid({ items, onAddToCart }: ProductGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden h-full flex flex-col">
          <CardContent className="p-4 flex-grow">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium line-clamp-2">{item.name}</h3>
                {item.category && (
                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                    {item.category.name}
                  </Badge>
                )}
              </div>
              <div className="mt-auto pt-2 flex justify-between items-end">
                <span className="text-lg font-bold">
                  ${item.price && typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                </span>
                <span className="text-sm text-muted-foreground">
                  Stock: {item.quantity}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-2 pt-0 border-t bg-muted/20">
            <Button
              onClick={() => onAddToCart(item)}
              className="w-full"
              size="sm"
              disabled={!item.price || item.quantity <= 0}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 