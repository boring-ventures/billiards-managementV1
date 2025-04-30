"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/tableUtils";

type FinanceTrendData = {
  date: string;
  income: number;
  expense: number;
};

type FinancialTrendsProps = {
  companyId: string;
  fullView?: boolean;
};

export default function FinancialTrends({ companyId, fullView = false }: FinancialTrendsProps) {
  const [data, setData] = useState<FinanceTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceTrends = async () => {
      try {
        setLoading(true);
        const days = fullView ? 30 : 7;
        const response = await fetch(`/api/analytics/finance-trends?companyId=${companyId}&days=${days}`);
        if (!response.ok) throw new Error('Failed to fetch finance trends');
        const trendsData = await response.json();
        setData(trendsData);
      } catch (error) {
        console.error('Error fetching finance trends:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchFinanceTrends();
    }
  }, [companyId, fullView]);

  if (loading) {
    return <div>Loading financial data...</div>;
  }

  if (data.length === 0) {
    return <div className="text-muted-foreground text-sm">No financial data available</div>;
  }

  // Calculate totals
  const totalIncome = data.reduce((sum, day) => sum + day.income, 0);
  const totalExpense = data.reduce((sum, day) => sum + day.expense, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      {!fullView && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Income</div>
            <div className="text-xl font-bold text-green-500">{formatPrice(totalIncome)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Expense</div>
            <div className="text-xl font-bold text-red-500">{formatPrice(totalExpense)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Net</div>
            <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPrice(netProfit)}
            </div>
          </div>
        </div>
      )}

      <div className={`w-full ${fullView ? 'h-[350px]' : 'h-[200px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tickFormatter={(value) => {
                // Format date to shorter version
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              tickFormatter={(value) => {
                // Format currency values
                return formatPrice(value).replace('$', '');
              }}
            />
            <Tooltip 
              formatter={(value) => formatPrice(Number(value))}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#10b981" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {fullView && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Income</div>
            <div className="text-2xl font-bold text-green-500">{formatPrice(totalIncome)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-2xl font-bold text-red-500">{formatPrice(totalExpense)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Net Profit/Loss</div>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPrice(netProfit)}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 