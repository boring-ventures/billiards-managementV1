import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { assertFinanceAccess } from "@/lib/financeUtils";

/**
 * DELETE: Delete a finance category if it has no linked transactions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get category ID from route params
    const categoryId = params.id;
    if (!categoryId) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }
    
    // Get the category to check its company
    const category = await prisma.financeCategory.findUnique({
      where: {
        id: categoryId,
      },
    });
    
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Check if user has access to this company's finance data
    try {
      await assertFinanceAccess(category.companyId, session.user.id);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized access to finance data" }, { status: 403 });
    }
    
    // Check if category has transactions
    const transactionCount = await prisma.financeTransaction.count({
      where: {
        categoryId,
      },
    });
    
    if (transactionCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with linked transactions" },
        { status: 400 }
      );
    }
    
    // Delete the category
    await prisma.financeCategory.delete({
      where: {
        id: categoryId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
} 