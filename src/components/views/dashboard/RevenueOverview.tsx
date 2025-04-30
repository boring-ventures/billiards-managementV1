"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, DollarSignIcon } from "lucide-react";
import { formatPrice } from "@/lib/tableUtils";
import { cn } from "@/lib/utils";

type RevenueData = {
  posRevenue: number;
  otherIncome: number;
  expenses: number;
};

export default function RevenueOverview({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RevenueData>({
    posRevenue: 0,
    otherIncome: 0,
    expenses: 0
  });

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/revenue?companyId=${companyId}`);
        if (!response.ok) throw new Error('Failed to fetch revenue data');
        const revenueData = await response.json();
        setData(revenueData);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchRevenueData();
    }
  }, [companyId]);

  // Calculate total income
  const totalIncome = data.posRevenue + data.otherIncome;
  // Calculate net revenue (income - expenses)
  const netRevenue = totalIncome - data.expenses;
  // Determine if net revenue is positive
  const isPositive = netRevenue >= 0;

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-400/5 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">POS Revenue</CardTitle>
          <DollarSignIcon className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">
            {loading ? "Loading..." : formatPrice(data.posRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Today&apos;s POS sales
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-400/5 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">Other Income</CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">
            {loading ? "Loading..." : formatPrice(data.otherIncome)}
          </div>
          <p className="text-xs text-muted-foreground">
            Today&apos;s non-POS income
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-400/5 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">
            {loading ? "Loading..." : formatPrice(data.expenses)}
          </div>
          <p className="text-xs text-muted-foreground">
            Today&apos;s expenses
          </p>
        </CardContent>
      </Card>
    </>
  );
} 