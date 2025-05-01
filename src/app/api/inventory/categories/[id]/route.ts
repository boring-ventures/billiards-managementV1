import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// DELETE - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const id = params.id;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get the user's profile for role check
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Only admins can delete categories
    if (!profile || (profile.role.toString() !== "ADMIN" && profile.role.toString() !== "SUPERADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Check if category exists
    const category = await prisma.inventoryCategory.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
    
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }
    
    // Check if category has items
    if (category.items.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with associated items" },
        { status: 400 }
      );
    }
    
    // Delete the category
    await prisma.inventoryCategory.delete({
      where: { id },
    });
    
    return NextResponse.json(
      { message: "Category deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
} 