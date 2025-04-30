"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FinanceCategoryType } from "@prisma/client";
import { format } from "date-fns";
import { AddTransactionModal } from "./AddTransactionModal";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { cn } from "@/lib/utils";

// Types
interface FinanceTransaction {
  id: string;
  amount: number;
  transactionDate: Date;
  description: string | null;
  staff: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    categoryType: FinanceCategoryType;
  };
}

interface FinanceCategory {
  id: string;
  name: string;
  categoryType: FinanceCategoryType;
}

interface Staff {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface TransactionsListProps {
  companyId: string;
}

export function TransactionsList({ companyId }: TransactionsListProps) {
  // State
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  
  const { toast } = useToast();

  // Fetch transactions, categories, and staff data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch transactions
        const txnResponse = await fetch(`/api/finance/transactions?companyId=${companyId}`);
        if (!txnResponse.ok) throw new Error("Failed to fetch transactions");
        const txnData = await txnResponse.json();
        
        // Fetch categories
        const catResponse = await fetch(`/api/finance/categories?companyId=${companyId}`);
        if (!catResponse.ok) throw new Error("Failed to fetch categories");
        const catData = await catResponse.json();
        
        // Fetch staff (admins)
        const staffResponse = await fetch(`/api/staff?companyId=${companyId}&role=admin`);
        if (!staffResponse.ok) throw new Error("Failed to fetch staff");
        const staffData = await staffResponse.json();
        
        setTransactions(txnData);
        setCategories(catData);
        setStaff(staffData);
      } catch (error) {
        console.error("Error fetching finance data:", error);
        toast({
          title: "Error",
          description: "Failed to load finance data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    if (companyId) {
      fetchData();
    }
    
    // Add event listener for the New Transaction button
    const newTxnBtn = document.getElementById("new-transaction-btn");
    if (newTxnBtn) {
      newTxnBtn.addEventListener("click", () => setShowTransactionModal(true));
    }
    
    return () => {
      if (newTxnBtn) {
        newTxnBtn.removeEventListener("click", () => setShowTransactionModal(true));
      }
    };
  }, [companyId, toast]);

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by search term (description)
    const matchesSearch = transaction.description 
      ? transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
      
    // Filter by category
    const matchesCategory = selectedCategory === "all" || 
      transaction.category.id === selectedCategory;
      
    // Filter by transaction type
    const matchesType = selectedType === "all" || 
      transaction.category.categoryType === selectedType;
      
    // Filter by staff
    const matchesStaff = selectedStaff === "all" || 
      (transaction.staff && transaction.staff.id === selectedStaff);
      
    // Filter by date range
    const matchesDateRange = (!dateRange.from || new Date(transaction.transactionDate) >= dateRange.from) &&
      (!dateRange.to || new Date(transaction.transactionDate) <= dateRange.to);
      
    return matchesSearch && matchesCategory && matchesType && matchesStaff && matchesDateRange;
  });

  // Handle transaction added
  const handleTransactionAdded = (newTransaction: FinanceTransaction) => {
    setTransactions(prev => [...prev, newTransaction]);
    setShowTransactionModal(false);
    toast({
      title: "Success",
      description: "Transaction added successfully",
    });
  };

  // Handle category added/updated
  const handleCategoriesUpdated = (updatedCategories: FinanceCategory[]) => {
    setCategories(updatedCategories);
    toast({
      title: "Success",
      description: "Categories updated successfully",
    });
  };

  // Format date to display
  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM dd, yyyy");
  };

  // Format staff name
  const getStaffName = (staff: Staff | null) => {
    if (!staff) return "System";
    return [staff.firstName, staff.lastName].filter(Boolean).join(" ") || "Unknown";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="Search by description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <Select
          value={selectedType}
          onValueChange={setSelectedType}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={selectedStaff}
          onValueChange={setSelectedStaff}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {getStaffName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Date range filter */}
      <div className="flex items-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.from && !dateRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                "Filter by date"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              initialFocus
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        
        {(dateRange.from || dateRange.to) && (
          <Button 
            variant="ghost" 
            onClick={() => setDateRange({ from: undefined, to: undefined })}
          >
            Clear Date
          </Button>
        )}
        
        <Button 
          variant="outline" 
          className="ml-auto"
          onClick={() => setShowCategoriesModal(true)}
        >
          Manage Categories
        </Button>
      </div>

      {/* Transactions table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  No transactions found. Add new transactions to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                  <TableCell>{transaction.category.name}</TableCell>
                  <TableCell>
                    {transaction.category.categoryType === "INCOME" ? (
                      <Badge variant="success">Income</Badge>
                    ) : (
                      <Badge variant="destructive">Expense</Badge>
                    )}
                  </TableCell>
                  <TableCell>{transaction.description || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStaffName(transaction.staff)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(transaction.id);
                            toast({
                              title: "Copied",
                              description: "Transaction ID copied to clipboard",
                            });
                          }}
                        >
                          Copy ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <AddTransactionModal
          companyId={companyId}
          categories={categories}
          onClose={() => setShowTransactionModal(false)}
          onTransactionAdded={handleTransactionAdded}
        />
      )}

      {/* Categories Modal */}
      {showCategoriesModal && (
        <CategoryManagementModal
          companyId={companyId}
          categories={categories}
          onClose={() => setShowCategoriesModal(false)}
          onCategoriesUpdated={handleCategoriesUpdated}
        />
      )}
    </div>
  );
} 