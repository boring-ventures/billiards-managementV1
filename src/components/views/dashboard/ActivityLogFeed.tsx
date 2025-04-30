"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { TableActivityLog, Profile } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, UserIcon } from "lucide-react";

type ActivityLogWithUser = TableActivityLog & {
  user: Profile | null;
};

type ActivityLogFeedProps = {
  companyId: string;
  limit?: number;
};

export default function ActivityLogFeed({ companyId, limit = 10 }: ActivityLogFeedProps) {
  const [activities, setActivities] = useState<ActivityLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    entityType: "",
    userId: "",
    hours: 24
  });

  useEffect(() => {
    const fetchActivityLogs = async () => {
      try {
        setLoading(true);
        
        let url = `/api/analytics/activity-logs?companyId=${companyId}&limit=${limit}`;
        
        // Add optional filters
        if (filter.entityType) url += `&entityType=${filter.entityType}`;
        if (filter.userId) url += `&userId=${filter.userId}`;
        if (filter.hours) url += `&hours=${filter.hours}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchActivityLogs();
    }
  }, [companyId, limit, filter]);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <span className="bg-green-100 text-green-800 p-1 rounded">Created</span>;
      case 'update':
        return <span className="bg-blue-100 text-blue-800 p-1 rounded">Updated</span>;
      case 'delete':
        return <span className="bg-red-100 text-red-800 p-1 rounded">Deleted</span>;
      case 'start':
        return <span className="bg-purple-100 text-purple-800 p-1 rounded">Started</span>;
      case 'end':
        return <span className="bg-orange-100 text-orange-800 p-1 rounded">Ended</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 p-1 rounded">{action}</span>;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'table':
        return <span className="bg-blue-50 text-blue-500 p-1 rounded">Table</span>;
      case 'tablesession':
        return <span className="bg-green-50 text-green-500 p-1 rounded">Session</span>;
      case 'inventoryitem':
        return <span className="bg-amber-50 text-amber-500 p-1 rounded">Inventory</span>;
      case 'posorder':
        return <span className="bg-purple-50 text-purple-500 p-1 rounded">Order</span>;
      default:
        return <span className="bg-gray-50 text-gray-500 p-1 rounded">{entityType}</span>;
    }
  };

  if (loading && activities.length === 0) {
    return <div>Loading activity logs...</div>;
  }

  if (activities.length === 0) {
    return <div className="text-muted-foreground text-sm">No activity logs found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <Select
          value={filter.entityType}
          onValueChange={(value) => setFilter({ ...filter, entityType: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="tableSession">Session</SelectItem>
            <SelectItem value="inventoryItem">Inventory</SelectItem>
            <SelectItem value="posOrder">Order</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filter.hours.toString()}
          onValueChange={(value) => setFilter({ ...filter, hours: parseInt(value) })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="48">Last 48 hours</SelectItem>
            <SelectItem value="72">Last 3 days</SelectItem>
            <SelectItem value="168">Last week</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline"
          onClick={() => setFilter({ entityType: "", userId: "", hours: 24 })}
          className="ml-auto"
        >
          Clear Filters
        </Button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex items-start p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="mr-3 mt-1">
              {getEntityIcon(activity.entityType)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">
                  {getActionIcon(activity.action)} {activity.entityType}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </div>
              </div>
              
              <div className="text-sm">
                {activity.metadata && 
                  <pre className="text-xs overflow-x-auto bg-gray-50 p-2 rounded">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                }
              </div>
              
              {activity.user && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {activity.user.firstName} {activity.user.lastName}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 