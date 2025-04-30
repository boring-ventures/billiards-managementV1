import { FinanceCategoryType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { startOfToday, endOfToday } from "date-fns";

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

/**
 * Calculate finance summary for a company
 * 
 * @param companyId Company ID
 * @param dateFrom Optional start date for filtering
 * @param dateTo Optional end date for filtering
 * @returns Finance summary object
 */
export async function calculateFinanceSummary(
  companyId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<FinanceSummary> {
  // Prepare date filters
  const dateFilter: {
    transactionDate?: {
      gte?: Date;
      lte?: Date;
    }
  } = {};
  
  if (dateFrom || dateTo) {
    dateFilter.transactionDate = {};
    
    if (dateFrom) {
      dateFilter.transactionDate.gte = dateFrom;
    }
    
    if (dateTo) {
      dateFilter.transactionDate.lte = dateTo;
    }
  }
  
  // Get all transactions for the company with specified date range
  const transactions = await prisma.financeTransaction.findMany({
    where: {
      companyId,
      ...dateFilter
    },
    include: {
      category: true
    }
  });
  
  // Calculate income and expense totals
  let totalIncome = 0;
  let totalExpense = 0;
  
  transactions.forEach(transaction => {
    const amount = Number(transaction.amount);
    
    if (transaction.category.categoryType === FinanceCategoryType.INCOME) {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
  });
  
  // Calculate net amount
  const netAmount = totalIncome - totalExpense;
  
  return {
    totalIncome,
    totalExpense,
    netAmount
  };
}

/**
 * Get today's finance summary for a company
 * 
 * @param companyId Company ID
 * @returns Finance summary for today
 */
export async function getTodayFinanceSummary(companyId: string): Promise<FinanceSummary> {
  const today = new Date();
  const startOfDay = startOfToday();
  const endOfDay = endOfToday();
  
  return calculateFinanceSummary(companyId, startOfDay, endOfDay);
}

/**
 * Get top categories by transaction volume
 * 
 * @param companyId Company ID
 * @param type Category type (INCOME or EXPENSE)
 * @param limit Number of categories to return
 * @returns Array of categories with total amounts
 */
export async function getTopCategories(
  companyId: string,
  type: FinanceCategoryType,
  limit = 5
): Promise<{ categoryId: string; categoryName: string; total: number }[]> {
  // Get all transactions for the company with specified category type
  const transactions = await prisma.financeTransaction.findMany({
    where: {
      companyId,
      category: {
        categoryType: type
      }
    },
    include: {
      category: true
    }
  });
  
  // Group transactions by category and sum amounts
  const categoryTotals = transactions.reduce((acc, transaction) => {
    const categoryId = transaction.categoryId;
    const amount = Number(transaction.amount);
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryId,
        categoryName: transaction.category.name,
        total: 0
      };
    }
    
    acc[categoryId].total += amount;
    
    return acc;
  }, {} as Record<string, { categoryId: string; categoryName: string; total: number }>);
  
  // Convert to array and sort by total
  const sortedCategories = Object.values(categoryTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
  
  return sortedCategories;
}

/**
 * Assert that user has access to finance data
 * Throws an error if user doesn't have admin access to the company
 * 
 * @param companyId Company ID to check access for
 * @param userId User ID to check
 */
export async function assertFinanceAccess(companyId: string, userId: string): Promise<void> {
  const profile = await prisma.profile.findFirst({
    where: {
      userId,
      companyId,
      OR: [
        { role: "ADMIN" },
        { role: "SUPERADMIN" },
      ]
    }
  });
  
  if (!profile) {
    throw new Error("Unauthorized access to finance data");
  }
} 