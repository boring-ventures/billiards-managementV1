import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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

// GET: Fetch a specific inventory item
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const itemId = params.id;
    
    const item = await prisma.inventoryItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" }, 
        { status: 404 }
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

// PUT: Update an inventory item
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const itemId = params.id;
    
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
        user: {
          email: userEmail
        }
      },
    });
    
    // Verify admin permissions
    if (!profile || ![UserRole.ADMIN, UserRole.SUPERADMIN].includes(profile.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
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
      where: { id: itemId },
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

// DELETE: Delete an inventory item
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const itemId = params.id;
    
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
        user: {
          email: userEmail
        }
      },
    });
    
    // Verify admin permissions
    if (!profile || ![UserRole.ADMIN, UserRole.SUPERADMIN].includes(profile.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Delete related inventory transactions first
    await prisma.inventoryTransaction.deleteMany({
      where: { itemId },
    });
    
    // Delete the inventory item
    await prisma.inventoryItem.delete({
      where: { id: itemId },
    });
    
    return NextResponse.json(
      { message: "Inventory item deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
} 