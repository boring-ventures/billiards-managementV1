import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE: Delete an inventory category
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const categoryId = params.id;
    
    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile to check role
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 401 });
    }
    
    const profile = await prisma.profile.findFirst({
      where: { 
        email: userEmail
      },
    });
    
    // Verify admin permissions
    if (!profile || ![UserRole.ADMIN, UserRole.SUPERADMIN].includes(profile.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Check if category exists
    const existingCategory = await prisma.inventoryCategory.findUnique({
      where: { id: categoryId },
      include: {
        items: {
          select: { id: true },
          take: 1,
        },
      },
    });
    
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }
    
    // Check if category has items
    if (existingCategory.items.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category that contains items. Remove or reassign items first." },
        { status: 400 }
      );
    }
    
    // Delete the category
    await prisma.inventoryCategory.delete({
      where: { id: categoryId },
    });
    
    return NextResponse.json(
      { message: "Category deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
} 