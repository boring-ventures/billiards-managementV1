import { NextRequest, NextResponse } from "next/server";
import { auth, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// DELETE /api/finance/transactions/[id] - Delete a transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get the current user's session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile with company information
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    
    // Get the profile, which includes the company ID and role
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has admin permissions
    if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Only admins can delete transactions" }, { status: 403 });
    }

    // Find the transaction to make sure it exists and belongs to the user's company
    const transaction = await db.financeTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Check if the transaction belongs to the user's company
    if (transaction.companyId !== profile.companyId) {
      return NextResponse.json(
        { error: "Transaction does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete the transaction
    await db.financeTransaction.delete({
      where: { id },
    });

    // Log the activity
    await db.tableActivityLog.create({
      data: {
        companyId: profile.companyId,
        userId: profile.id,
        action: "DELETE",
        entityType: "FINANCE_TRANSACTION",
        entityId: id,
        metadata: { transactionId: id },
      },
    });

    return NextResponse.json(
      { message: "Transaction deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
} 