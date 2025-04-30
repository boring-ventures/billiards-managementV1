import { format, startOfToday, startOfWeek, endOfWeek, subDays, eachDayOfInterval } from "date-fns";
import { FinanceCategoryType } from "@prisma/client";
import { db } from "./db";

/**
 * Get today's revenue from POS orders
 */
export async function getTodayPosRevenue(companyId: string): Promise<number> {
  const today = startOfToday();
  
  const result = await db.posOrder.aggregate({
    where: {
      companyId,
      createdAt: {
        gte: today
      }
    },
    _sum: {
      totalAmount: true
    }
  });
  
  return Number(result._sum.totalAmount || 0);
}

/**
 * Get today's income from finance transactions
 */
export async function getTodayFinanceIncome(companyId: string): Promise<number> {
  const today = startOfToday();
  
  const result = await db.financeTransaction.aggregate({
    where: {
      companyId,
      transactionDate: {
        gte: today
      },
      category: {
        categoryType: FinanceCategoryType.INCOME
      }
    },
    _sum: {
      amount: true
    }
  });
  
  return Number(result._sum.amount || 0);
}

/**
 * Get today's expenses from finance transactions
 */
export async function getTodayFinanceExpense(companyId: string): Promise<number> {
  const today = startOfToday();
  
  const result = await db.financeTransaction.aggregate({
    where: {
      companyId,
      transactionDate: {
        gte: today
      },
      category: {
        categoryType: FinanceCategoryType.EXPENSE
      }
    },
    _sum: {
      amount: true
    }
  });
  
  return Number(result._sum.amount || 0);
}

/**
 * Get active table sessions
 */
export async function getActiveTableSessions(companyId: string) {
  return db.tableSession.findMany({
    where: {
      companyId,
      endedAt: null,
      status: "ACTIVE"
    },
    include: {
      table: true
    },
    orderBy: {
      startedAt: "asc"
    }
  });
}

/**
 * Get top selling products for the current week
 */
export async function getTopProducts(companyId: string, limit = 5) {
  const startDate = startOfWeek(new Date());
  const endDate = endOfWeek(new Date());
  
  const topProducts = await db.posOrderItem.groupBy({
    by: ["itemId"],
    where: {
      order: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    },
    _sum: {
      quantity: true,
      lineTotal: true
    },
    orderBy: {
      _sum: {
        quantity: "desc"
      }
    },
    take: limit
  });
  
  // Fetch product details for each top product
  const productsWithDetails = await Promise.all(
    topProducts.map(async (product) => {
      const item = await db.inventoryItem.findUnique({
        where: { id: product.itemId }
      });
      
      return {
        item,
        quantitySold: product._sum.quantity || 0,
        revenue: Number(product._sum.lineTotal || 0)
      };
    })
  );
  
  return productsWithDetails;
}

/**
 * Get finance data for the last 7 days
 */
export async function getFinanceTrends(companyId: string, days = 7) {
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);
  
  // Get all days in the interval
  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Get all transactions in the date range
  const transactions = await db.financeTransaction.findMany({
    where: {
      companyId,
      transactionDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      category: true
    }
  });
  
  // Create a data point for each day
  const trends = daysInterval.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    
    // Filter transactions for this day
    const dayTransactions = transactions.filter(
      t => format(t.transactionDate, "yyyy-MM-dd") === dayStr
    );
    
    // Calculate income and expense for the day
    const income = dayTransactions
      .filter(t => t.category.categoryType === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const expense = dayTransactions
      .filter(t => t.category.categoryType === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      date: dayStr,
      income,
      expense
    };
  });
  
  return trends;
}

/**
 * Get inventory items below critical threshold
 */
export async function getInventoryAlerts(companyId: string) {
  return db.inventoryItem.findMany({
    where: {
      companyId,
      quantity: {
        lt: db.inventoryItem.fields.criticalThreshold
      }
    },
    orderBy: {
      quantity: "asc"
    }
  });
}

/**
 * Get recent activity logs
 */
export async function getActivityLogs(
  companyId: string, 
  options?: { 
    limit?: number;
    entityType?: string;
    userId?: string;
    hours?: number;
  }
) {
  const { limit = 10, entityType, userId, hours = 24 } = options || {};
  const sinceDatetime = subDays(new Date(), hours / 24); // Convert hours to days
  
  return db.tableActivityLog.findMany({
    where: {
      companyId,
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
      createdAt: {
        gte: sinceDatetime
      }
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });
} 