import { NextRequest, NextResponse } from "next/server";
import { auth, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET: List all transactions for a company
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile with company information
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    
    // Get the profile with company ID
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile || !profile.companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }
    
    const companyId = profile.companyId;
    
    // Fetch all transactions for this company with related data
    const transactions = await db.financeTransaction.findMany({
      where: {
        companyId,
      },
      include: {
        category: true,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST: Create a new transaction
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile with company information
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    
    // Get the profile with company ID
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile || !profile.companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }
    
    const companyId = profile.companyId;
    
    // Parse request body
    const body = await req.json();
    const { categoryId, amount, transactionDate, description } = body;
    
    // Validate inputs
    if (!categoryId || !amount || !transactionDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Create the transaction
    const transaction = await db.financeTransaction.create({
      data: {
        companyId,
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
} 