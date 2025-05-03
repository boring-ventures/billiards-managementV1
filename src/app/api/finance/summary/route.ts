import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/auth-utils";
import { 
  calculateFinanceSummary, 
  getTodayFinanceSummary,
  getTopCategories,
  assertFinanceAccess 
} from "@/lib/financeUtils";
import { FinanceCategoryType } from "@prisma/client";

/**
 * GET: Get finance summary data for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const { user, error } = await validateSession();
    
    if (error || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the company ID from the request
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const period = searchParams.get('period') || 'month';
    
    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Get time range based on period
    const today = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
    }

    // Aggregate income data
    const income = await prisma.financeTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        companyId: companyId,
        type: 'INCOME',
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Aggregate expense data
    const expense = await prisma.financeTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        companyId: companyId,
        type: 'EXPENSE',
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Calculate totals and profit
    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;
    const profit = totalIncome - totalExpense;

    // Get transactions by category
    const categorySummary = await prisma.financeTransaction.groupBy({
      by: ['categoryId'],
      _sum: {
        amount: true,
      },
      where: {
        companyId: companyId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Fetch category details to include names
    const categories = await prisma.financeCategory.findMany({
      where: {
        id: {
          in: categorySummary.map(item => item.categoryId),
        },
      },
    });

    // Combine category data
    const categoryData = categorySummary.map(item => {
      const category = categories.find(cat => cat.id === item.categoryId);
      return {
        categoryId: item.categoryId,
        categoryName: category?.name || 'Unknown',
        type: category?.type || 'UNKNOWN',
        amount: item._sum.amount || 0,
      };
    });

    // Return the summary data
    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        profit,
        period,
        startDate: startDate.toISOString(),
        endDate: today.toISOString(),
      },
      categoryData,
    });
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    return NextResponse.json(
      { error: "Failed to fetch finance summary" },
      { status: 500 }
    );
  }
} 