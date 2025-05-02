import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

interface RouteParams {
  params: {
    id: string;
  };
}

// Validation schema for updating inventory items
const inventoryItemSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().min(0, "Quantity can't be negative"),
  criticalThreshold: z.number().min(0, "Threshold can't be negative"),
  price: z.number().min(0, "Price can't be negative").optional().nullable(),
});

// GET - Get a single inventory item
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }
    
    // Get the session for authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile to check role
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Check for superadmin
    const isSuperAdmin = profile?.role === UserRole.SUPERADMIN;
    
    // Fetch the item
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            staff: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    
    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }
    
    // For non-superadmins, verify the item belongs to their company
    if (!isSuperAdmin && item.companyId !== profile.companyId) {
      return NextResponse.json(
        { error: "Unauthorized to access this item" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

// PUT - Update an inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }
    
    // Get the user's profile for role check
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Only admins can update inventory items
    if (!profile || (profile.role.toString() !== "ADMIN" && profile.role.toString() !== "SUPERADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: id },
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Parse and validate input
    const body = await request.json();
    const result = inventoryItemSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const data = result.data;
    
    // Calculate quantity change for transaction record
    const quantityDelta = data.quantity - existingItem.quantity;
    
    // Update the inventory item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: id },
      data: {
        name: data.name,
        categoryId: data.categoryId || null,
        sku: data.sku || null,
        quantity: data.quantity,
        criticalThreshold: data.criticalThreshold,
        price: data.price !== undefined ? data.price : null,
      },
    });
    
    // Create an inventory transaction for quantity changes
    if (quantityDelta !== 0) {
      await prisma.inventoryTransaction.create({
        data: {
          companyId: data.companyId,
          itemId: updatedItem.id,
          transactionType: quantityDelta > 0 ? "INCOMING" : "ADJUSTMENT",
          quantityDelta: quantityDelta,
          note: "Manual inventory adjustment",
          staffId: profile.id,
        },
      });
    }
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an inventory item
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
    
    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }
    
    // Get the user's profile for role check
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Only admins can delete inventory items
    if (!profile || (profile.role.toString() !== "ADMIN" && profile.role.toString() !== "SUPERADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }
    
    // Delete related transactions first
    await prisma.inventoryTransaction.deleteMany({
      where: { itemId: id },
    });
    
    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id },
    });
    
    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
} 