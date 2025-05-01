"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/tableUtils";

interface TableUsageData {
  today: UsagePeriod[];
  week: UsagePeriod[];
  month: UsagePeriod[];
}

interface UsagePeriod {
  name: string;
  hours: number;
  revenue: number;
}

interface TableUsageStatsProps {
  tableId: string;
  companyId: string;
}

export function TableUsageStats({ tableId, companyId }: TableUsageStatsProps) {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<TableUsageData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("today");

  useEffect(() => {
    async function fetchTableUsageData() {
      try {
        const response = await fetch(`/api/tables/${tableId}/stats?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch table usage statistics");
        }
        const data = await response.json();
        setUsageData(data);
      } catch (error) {
        console.error("Error fetching table usage statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTableUsageData();
  }, [tableId, companyId]);

  const renderActiveData = () => {
    if (!usageData) return [];
    
    switch (activeTab) {
      case "today":
        return usageData.today;
      case "week":
        return usageData.week;
      case "month":
        return usageData.month;
      default:
        return usageData.today;
    }
  };

  const getTotal = (type: "hours" | "revenue") => {
    const data = renderActiveData();
    if (!data.length) return 0;
    
    return data.reduce((sum, item) => sum + item[type], 0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="today" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
          
          {usageData ? (
            <>
              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{getTotal("hours").toFixed(1)}h</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatPrice(getTotal("revenue"))}</p>
                </div>
              </div>
              
              <TabsContent value="today" className="mt-0">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usageData.today}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === "revenue") return [formatPrice(value as number), "Revenue"];
                        return [value, "Hours"];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="hours" name="Hours" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="week" className="mt-0">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usageData.week}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === "revenue") return [formatPrice(value as number), "Revenue"];
                        return [value, "Hours"];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="hours" name="Hours" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="month" className="mt-0">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usageData.month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === "revenue") return [formatPrice(value as number), "Revenue"];
                        return [value, "Hours"];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="hours" name="Hours" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-muted-foreground">No usage data available</p>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
} 