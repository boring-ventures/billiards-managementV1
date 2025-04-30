"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatPrice } from "@/lib/tableUtils";
import { InventoryItem } from "@prisma/client";

type ProductData = {
  item: InventoryItem | null;
  quantitySold: number;
  revenue: number;
};

type ProductPerformanceProps = {
  companyId: string;
  fullView?: boolean;
};

export default function ProductPerformance({ companyId, fullView = false }: ProductPerformanceProps) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/top-products?companyId=${companyId}`);
        if (!response.ok) throw new Error('Failed to fetch top products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching top products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchTopProducts();
    }
  }, [companyId]);

  if (loading) {
    return <div>Loading product data...</div>;
  }

  if (products.length === 0) {
    return <div className="text-muted-foreground text-sm">No product data available</div>;
  }

  // Prepare chart data
  const chartData = products.map((product) => ({
    name: product.item?.name || 'Unknown',
    quantity: product.quantitySold,
    revenue: product.revenue
  }));

  return (
    <div className="space-y-4">
      {fullView && (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'revenue') return formatPrice(Number(value));
                  return value;
                }}
              />
              <Bar dataKey="quantity" fill="#8884d8" name="Quantity Sold" />
              <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Qty Sold</TableHead>
            <TableHead>Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.item?.id || Math.random().toString()}>
              <TableCell className="font-medium">{product.item?.name || 'Unknown'}</TableCell>
              <TableCell>{product.quantitySold}</TableCell>
              <TableCell>{formatPrice(product.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 