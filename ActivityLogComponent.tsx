import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { CalendarIcon } from 'lucide-react';
import { formatDistance } from 'date-fns';

type ActivityLog = {
  id: number;
  user_id: string;
  company_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  user: {
    full_name: string;
  };
};

type ActivityLogProps = {
  companyId: string;
};

export default function ActivityLogComponent({ companyId }: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const pageSize = 10;

  useEffect(() => {
    fetchLogs();
  }, [companyId, currentPage, actionTypeFilter, resourceTypeFilter, userFilter, dateFilter, searchQuery]);

  async function fetchLogs() {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      // Apply filters
      if (actionTypeFilter) {
        query = query.eq('action_type', actionTypeFilter);
      }
      
      if (resourceTypeFilter) {
        query = query.eq('resource_type', resourceTypeFilter);
      }
      
      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }
      
      if (dateFilter) {
        // Handle date filtering based on the selected option
        const now = new Date();
        let startDate;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            query = query.gte('created_at', startDate.toISOString());
            break;
          case 'yesterday':
            startDate = new Date(now.setDate(now.getDate() - 1));
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            query = query.gte('created_at', startDate.toISOString());
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            query = query.gte('created_at', startDate.toISOString());
            break;
        }
      }
      
      if (searchQuery) {
        query = query.or(`details.ilike.%${searchQuery}%,resource_id.ilike.%${searchQuery}%`);
      }

      // Get count for pagination
      const { count } = await supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Fetch the filtered data
      const { data, error } = await query;

      if (error) throw error;
      
      setLogs(data as ActivityLog[]);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function getActionTypeColor(actionType: string) {
    switch (actionType) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatActionDetails(log: ActivityLog) {
    const { action_type, resource_type, details } = log;
    
    switch (`${action_type}_${resource_type}`) {
      case 'create_pos_order':
        return `Created order #${details.order_id} with ${details.order_items} items totaling ${formatCurrency(details.total_amount)}`;
      case 'update_inventory_item':
        return `Updated inventory item "${details.name}" - ${details.changes.join(', ')}`;
      case 'login_auth':
        return `Logged in from ${details.ip_address || 'unknown location'}`;
      default:
        return JSON.stringify(details);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          Track all user actions across the system
        </CardDescription>
        
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex-1 min-w-[200px]">
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="login">Login</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Resources</SelectItem>
              <SelectItem value="pos_order">Orders</SelectItem>
              <SelectItem value="inventory_item">Inventory</SelectItem>
              <SelectItem value="table">Tables</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="auth">Authentication</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span title={new Date(log.created_at).toLocaleString()}>
                            {formatDistance(new Date(log.created_at), new Date(), { addSuffix: true })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{log.user?.full_name || 'Unknown User'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </TableCell>
                      <TableCell>{log.resource_type}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {formatActionDetails(log)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No activity logs found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 