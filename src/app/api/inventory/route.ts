import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET: Fetch all inventory items for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Get inventory items with their categories
    const items = await prisma.inventoryItem.findMany({
      where: {
        companyId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

// Validation schema for creating/updating inventory items
const inventoryItemSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().min(0, "Quantity can't be negative"),
  criticalThreshold: z.number().min(0, "Threshold can't be negative"),
  price: z.number().min(0, "Price can't be negative").optional().nullable(),
});

// POST: Create a new inventory item
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile to check role
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Verify admin permissions
    if (!profile || ![UserRole.ADMIN, UserRole.SUPERADMIN].includes(profile.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
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
    
    // Create the inventory item
    const newItem = await prisma.inventoryItem.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        categoryId: data.categoryId || null,
        sku: data.sku || null,
        quantity: data.quantity,
        criticalThreshold: data.criticalThreshold,
        price: data.price !== undefined ? data.price : null,
      },
    });
    
    // Create an inventory transaction for the initial stock
    if (data.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          companyId: data.companyId,
          itemId: newItem.id,
          transactionType: "INCOMING",
          quantityDelta: data.quantity,
          note: "Initial inventory setup",
          staffId: profile.id,
        },
      });
    }
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
} 