"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/tableUtils";
import { hasAdminPermission } from "@/lib/rbac";
import { DeleteIcon, FilterIcon } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { Profile } from "@prisma/client";

type FinanceTransaction = {
  id: string;
  companyId: string;
  categoryId: string;
  amount: number;
  transactionDate: string;
  description: string | null;
  staffId: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    categoryType: "INCOME" | "EXPENSE";
  };
  staff: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

type TableMaintenanceCost = {
  id: string;
  companyId: string;
  tableId: string;
  description: string | null;
  maintenanceAt: string;
  cost: number | null;
  createdAt: string;
  updatedAt: string;
  table: {
    name: string;
  };
};

type TransactionListProps = {
  profile: Profile;
};

export function TransactionList({ profile }: TransactionListProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [maintenanceCosts, setMaintenanceCosts] = useState<TableMaintenanceCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, income, expense, maintenance
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransaction | null>(null);
  
  const isAdmin = hasAdminPermission(profile);

  // Function to fetch transactions data
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Initialize base URLs
      let transactionsUrl = "/api/finance/transactions";
      let maintenanceUrl = "/api/tables/maintenance";
      
      // For superadmins, check if they have a selected company
      if (profile.role === "SUPERADMIN") {
        const selectedCompanyId = localStorage.getItem('selectedCompanyId');
        if (selectedCompanyId) {
          transactionsUrl += `?companyId=${selectedCompanyId}`;
          maintenanceUrl += `?companyId=${selectedCompanyId}`;
        }
        // If no company selected, don't append companyId parameter
      } else if (profile.companyId) {
        // For regular users, always use their assigned company
        transactionsUrl += `?companyId=${profile.companyId}`;
        maintenanceUrl += `?companyId=${profile.companyId}`;
      }
      
      const response = await fetch(transactionsUrl);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data.transactions);
      
      // Also fetch maintenance costs
      const maintenanceResponse = await fetch(maintenanceUrl);
      if (maintenanceResponse.ok) {
        const maintenanceData = await maintenanceResponse.json();
        setMaintenanceCosts(maintenanceData.maintenanceRecords || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete transaction
  const handleDeleteClick = (transaction: FinanceTransaction) => {
    setSelectedTransaction(transaction);
    setDeleteModalOpen(true);
  };

  // Delete a transaction
  const deleteTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      const response = await fetch(`/api/finance/transactions/${selectedTransaction.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete transaction");
      
      setDeleteModalOpen(false);
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  // Filter transactions based on current filters
  const filteredTransactions = () => {
    let filtered = [...transactions];
    
    // Filter by type
    if (filter === "income") {
      filtered = filtered.filter(t => t.category.categoryType === "INCOME");
    } else if (filter === "expense") {
      filtered = filtered.filter(t => t.category.categoryType === "EXPENSE");
    }
    
    // Filter by date
    if (dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateRange === "today") {
        filtered = filtered.filter(t => new Date(t.transactionDate) >= today);
      } else if (dateRange === "week") {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        filtered = filtered.filter(t => new Date(t.transactionDate) >= weekStart);
      } else if (dateRange === "month") {
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        filtered = filtered.filter(t => new Date(t.transactionDate) >= monthStart);
      }
    }
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(term) ||
        t.category.name.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Get total income
  const totalIncome = filteredTransactions()
    .filter(t => t.category.categoryType === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Get total expense
  const totalExpense = filteredTransactions()
    .filter(t => t.category.categoryType === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  // Get total maintenance cost
  const totalMaintenance = maintenanceCosts
    .reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="bg-green-100 py-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-green-600">{formatPrice(totalIncome)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="bg-red-100 py-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-red-600">{formatPrice(totalExpense)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="bg-yellow-100 py-2">
            <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-yellow-600">{formatPrice(totalMaintenance)}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                placeholder="Search description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Transaction Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isAdmin && <TableHead className="w-[70px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filter === "maintenance" ? (
                // Show maintenance costs
                maintenanceCosts.map((maintenance) => (
                  <TableRow key={maintenance.id}>
                    <TableCell>{formatDate(maintenance.maintenanceAt)}</TableCell>
                    <TableCell>Table Maintenance</TableCell>
                    <TableCell>
                      {maintenance.description || `Maintenance for ${maintenance.table.name}`}
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatPrice(Number(maintenance.cost) || 0)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        -
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                // Show financial transactions
                filteredTransactions().length > 0 ? (
                  filteredTransactions().map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                      <TableCell>{transaction.category.name}</TableCell>
                      <TableCell>{transaction.description || "-"}</TableCell>
                      <TableCell>
                        {transaction.staff
                          ? `${transaction.staff.firstName || ""} ${transaction.staff.lastName || ""}`
                          : "-"}
                      </TableCell>
                      <TableCell 
                        className={`text-right font-medium ${
                          transaction.category.categoryType === "INCOME" 
                            ? "text-green-600" 
                            : "text-red-600"
                        }`}
                      >
                        {transaction.category.categoryType === "INCOME" ? "+" : "-"}
                        {formatPrice(Number(transaction.amount))}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(transaction)}
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-6">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteTransaction}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
      />
    </div>
  );
} 