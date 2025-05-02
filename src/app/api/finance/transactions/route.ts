import { NextRequest, NextResponse } from "next/server";
import { auth, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET: List all transactions for a company
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const specificCompanyId = searchParams.get("companyId");
    
    // Check if user is authenticated
    if (!session || !session.user) {
      console.log("Finance transactions: Auth failed - No session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile with company information
    const user = await getCurrentUser();
    
    if (!user) {
      console.log("Finance transactions: getCurrentUser returned no user");
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    if (!user.id) {
      console.log("Finance transactions: User has no ID");
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }
    
    console.log("Finance transactions: Trying to find profile for user ID:", user.id);
    
    // Get the profile with role information
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile) {
      console.log("Finance transactions: No profile found for user ID:", user.id);
      return NextResponse.json({ error: "No profile found for user" }, { status: 400 });
    }
    
    let companyId: string | null = null;
    
    // Check if the user is a SUPERADMIN
    if (profile.role && profile.role.toString() === "SUPERADMIN") {
      // For superadmins, use the company ID from the query params if provided
      if (specificCompanyId) {
        companyId = specificCompanyId;
        console.log("Finance transactions: SUPERADMIN accessing company:", companyId);
      } else {
        // Superadmin with no company specified - return all transactions grouped by company
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
    } else {
      // For regular users, use their assigned company
      if (!profile.companyId) {
        console.log("Finance transactions: Profile has no companyId:", profile.id);
        return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
      }
      companyId = profile.companyId;
    }
    
    if (!companyId) {
      return NextResponse.json({ error: "No company ID available" }, { status: 400 });
    }
    
    console.log("Finance transactions: Using companyId:", companyId);
    
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
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
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
    
    // Determine the company ID to use
    let companyId: string;
    
    if (profile.role && profile.role.toString() === "SUPERADMIN") {
      // Superadmins must specify a companyId
      if (!requestCompanyId) {
        return NextResponse.json({ 
          error: "Company ID is required for superadmins",
          isSuperAdmin: true 
        }, { status: 400 });
      }
      
      // Verify the company exists
      const companyExists = await db.company.findUnique({
        where: { id: requestCompanyId },
      });
      
      if (!companyExists) {
        return NextResponse.json({ 
          error: "Company not found", 
          isSuperAdmin: true 
        }, { status: 404 });
      }
      
      companyId = requestCompanyId;
    } else {
      // Regular users must have a company associated with their profile
      if (!profile.companyId) {
        return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
      }
      companyId = profile.companyId;
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