import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth-server-utils";

/**
 * GET: List all transactions for a company
 */
export const GET = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const specificCompanyId = searchParams.get("companyId");
    
    // Get user profile for additional info
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile) {
      console.log("Finance transactions: No profile found for user ID:", user.id);
      return NextResponse.json({ error: "No profile found for user" }, { status: 400 });
    }
    
    // For superadmins with no specific company, return all transactions
    if (isSuperAdmin && !specificCompanyId && !effectiveCompanyId) {
      console.log("Finance transactions: SUPERADMIN fetching all transactions");
      
      const allTransactions = await db.financeTransaction.findMany({
        include: {
          category: true,
          company: {
            select: {
              id: true,
              name: true,
            }
          },
          staff: {
            select: {
              firstName: true,
              lastName: true,
            }
          },
        },
        orderBy: {
          transactionDate: "desc",
        },
      });
      
      return NextResponse.json({ transactions: allTransactions });
    }
    
    // For users with a company context, use their effective company ID
    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "No company context available" }, { status: 400 });
    }
    
    console.log("Finance transactions: Using companyId:", effectiveCompanyId);
    
    // Fetch transactions for this company with related data
    const transactions = await db.financeTransaction.findMany({
      where: { companyId: effectiveCompanyId },
      include: {
        category: true,
        company: {
          select: {
            id: true,
            name: true,
          }
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
      },
      orderBy: {
        transactionDate: "desc",
      },
    });
    
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}, { requireCompanyId: false }); // Not requiring allows superadmins to fetch all transactions

/**
 * POST: Create a new transaction
 */
export const POST = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    // Get user profile for staff ID reference
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "No profile found for user" }, { status: 400 });
    }
    
    // Parse request body
    const body = await req.json();
    const { categoryId, amount, transactionDate, description, companyId: requestCompanyId } = body;
    
    // Validate inputs
    if (!categoryId || !amount || !transactionDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Use effective company ID from auth context
    // For superadmins with a specifically requested company, the effectiveCompanyId
    // will already be that company if it's valid
    if (!effectiveCompanyId) {
      return NextResponse.json({ 
        error: "No valid company context available",
        isSuperAdmin 
      }, { status: 400 });
    }
    
    // Create the transaction
    const transaction = await db.financeTransaction.create({
      data: {
        companyId: effectiveCompanyId,
        categoryId,
        amount,
        transactionDate: new Date(transactionDate),
        description: description || null,
        staffId: profile.id, // Record which staff member created the transaction
      },
    });
    
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { requireCompanyId: true }); // Requiring ensures a valid company context

/**
 * PUT: Update an existing transaction
 */
export const PUT = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    // Parse request body
    const body = await req.json();
    const { id, categoryId, amount, transactionDate, description } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }
    
    // Fetch the transaction to check ownership
    const transaction = await db.financeTransaction.findUnique({
      where: { id },
    });
    
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    
    // Check if user has permission to update this transaction
    // Either superadmin or belongs to the same company
    if (!isSuperAdmin && transaction.companyId !== effectiveCompanyId) {
      return NextResponse.json({ error: "No permission to update this transaction" }, { status: 403 });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (amount !== undefined) updateData.amount = amount;
    if (transactionDate !== undefined) updateData.transactionDate = new Date(transactionDate);
    if (description !== undefined) updateData.description = description;
    
    // Update the transaction
    const updatedTransaction = await db.financeTransaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        company: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });
    
    return NextResponse.json({ transaction: updatedTransaction });
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { requireCompanyId: true });

/**
 * DELETE: Remove a transaction
 */
export const DELETE = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }
    
    // Fetch the transaction to check ownership
    const transaction = await db.financeTransaction.findUnique({
      where: { id },
    });
    
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    
    // Check if user has permission to delete this transaction
    // Either superadmin or belongs to the same company
    if (!isSuperAdmin && transaction.companyId !== effectiveCompanyId) {
      return NextResponse.json({ error: "No permission to delete this transaction" }, { status: 403 });
    }
    
    // Delete the transaction
    await db.financeTransaction.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { requireCompanyId: true }); 