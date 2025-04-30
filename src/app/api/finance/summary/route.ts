import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
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
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const period = searchParams.get("period") || "today"; // today, week, month, all
    
    // Validate company ID
    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }
    
    // Check if user has access to this company's finance data
    try {
      await assertFinanceAccess(companyId, session.user.id);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized access to finance data" }, { status: 403 });
    }
    
    // Calculate date ranges based on period
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    
    const now = new Date();
    
    if (period === "today") {
      // Today's data
      const todaySummary = await getTodayFinanceSummary(companyId);
      
      // Get top categories
      const topIncomeCategories = await getTopCategories(companyId, FinanceCategoryType.INCOME, 3);
      const topExpenseCategories = await getTopCategories(companyId, FinanceCategoryType.EXPENSE, 3);
      
      return NextResponse.json({
        summary: todaySummary,
        topIncomeCategories,
        topExpenseCategories,
      });
    } else if (period === "week") {
      // Last 7 days
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
      dateTo = now;
    } else if (period === "month") {
      // Last 30 days
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      dateTo = now;
    }
    
    // Calculate summary with date range
    const summary = await calculateFinanceSummary(companyId, dateFrom, dateTo);
    
    // Get top categories
    const topIncomeCategories = await getTopCategories(companyId, FinanceCategoryType.INCOME, 3);
    const topExpenseCategories = await getTopCategories(companyId, FinanceCategoryType.EXPENSE, 3);
    
    return NextResponse.json({
      summary,
      topIncomeCategories,
      topExpenseCategories,
    });
  } catch (error) {
    console.error("Error fetching finance summary:", error);
    return NextResponse.json({ error: "Failed to fetch finance summary" }, { status: 500 });
  }
} 