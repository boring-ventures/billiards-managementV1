import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { assertFinanceAccess } from "@/lib/financeUtils";

/**
 * GET: List all transactions for a company
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
    
    // Get all transactions for the company
    const transactions = await prisma.financeTransaction.findMany({
      where: {
        companyId,
      },
      include: {
        category: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        transactionDate: "desc",
      },
    });
    
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

/**
 * POST: Create a new transaction
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get request body
    const data = await request.json();
    const { companyId, categoryId, amount, description, transactionDate } = data;
    
    // Validate required fields
    if (!companyId || !categoryId || !amount || !transactionDate) {
      return NextResponse.json({ 
        error: "Missing required fields: companyId, categoryId, amount, transactionDate" 
      }, { status: 400 });
    }
    
    // Check if user has access to this company's finance data
    try {
      await assertFinanceAccess(companyId, session.user.id);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized access to finance data" }, { status: 403 });
    }
    
    // Get user profile to link as staff
    const userProfile = await prisma.profile.findFirst({
      where: {
        userId: session.user.id,
        companyId,
      },
    });
    
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    
    // Create transaction
    const newTransaction = await prisma.financeTransaction.create({
      data: {
        companyId,
        categoryId,
        amount,
        description,
        transactionDate: new Date(transactionDate),
        staffId: userProfile.id,
      },
      include: {
        category: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    // Log activity if needed
    // This would typically be handled by a separate function
    
    return NextResponse.json(newTransaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
} 