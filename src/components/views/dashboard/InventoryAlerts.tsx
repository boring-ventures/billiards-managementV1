"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { InventoryItem } from "@prisma/client";

type InventoryAlertsProps = {
  companyId: string;
  fullView?: boolean;
};

export default function InventoryAlerts({ companyId, fullView = false }: InventoryAlertsProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryAlerts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/inventory-alerts?companyId=${companyId}`);
        if (!response.ok) throw new Error('Failed to fetch inventory alerts');
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Error fetching inventory alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchInventoryAlerts();
    }
  }, [companyId]);

  if (loading) {
    return <div>Loading inventory alerts...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No inventory items below threshold
      </div>
    );
  }

  // For summary view, just show the number of items below threshold
  if (!fullView) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Inventory Alert</AlertTitle>
        <AlertDescription>
          {items.length} item{items.length !== 1 ? 's' : ''} below critical threshold
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Current Qty</TableHead>
          <TableHead>Threshold</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          // Calculate percentage of threshold
          const percentOfThreshold = (item.quantity / item.criticalThreshold) * 100;
          
          // Determine the status
          let status = "warning";
          if (percentOfThreshold <= 25) {
            status = "critical";
          } else if (percentOfThreshold <= 75) {
            status = "low";
          }
          
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.criticalThreshold}</TableCell>
              <TableCell>
                <Badge 
                  variant={status === "critical" ? "destructive" : "outline"}
                  className={status === "low" ? "bg-amber-200 text-amber-800" : ""}
                >
                  {status === "critical" ? "Critical" : status === "low" ? "Low" : "Warning"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
} 