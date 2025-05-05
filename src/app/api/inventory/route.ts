import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/auth-server-utils";

// Validation schema for creating/updating inventory items
const inventoryItemSchema = z.object({
  companyId: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().min(0, "Quantity can't be negative"),
  criticalThreshold: z.number().min(0, "Threshold can't be negative"),
  price: z.number().min(0, "Price can't be negative").optional().nullable(),
});

// GET: Fetch all inventory items for a company
export const GET = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    // Company ID is required for this endpoint
    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }
    
    console.log(`[API] /inventory GET - Using effectiveCompanyId: ${effectiveCompanyId}`);
    console.log(`[API] /inventory GET - User: ${user.id}, isSuperAdmin: ${isSuperAdmin}`);

    // Get inventory items for the company
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        companyId: effectiveCompanyId,
      },
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(inventoryItems);
    
  } catch (error) {
    console.error("[API] /inventory GET - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}, { requireCompanyId: true });

// POST: Create a new inventory item
export const POST = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    // Company ID is required for this endpoint
    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const validationResult = inventoryItemSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { companyId: requestedCompanyId, ...itemData } = validationResult.data;
    
    // Use effective company ID from auth context, not from request body
    // This ensures SUPERADMIN can create items in other companies while
    // regular users can only create in their own company
    
    // Create the inventory item
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        ...itemData,
        companyId: effectiveCompanyId,
      },
    });

    return NextResponse.json(inventoryItem);
    
  } catch (error) {
    console.error("[API] /inventory POST - Error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}, { requireCompanyId: true });

// PUT: Update an existing inventory item
export const PUT = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }
    
    // Validate the update data
    const validationResult = inventoryItemSchema.partial().safeParse(updateData);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Ensure the item belongs to the user's company
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });
    
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    
    // Check if user has access to this item's company
    if (existingItem.companyId !== effectiveCompanyId && !isSuperAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Update the item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: validationResult.data,
      include: { category: true },
    });
    
    return NextResponse.json(updatedItem);
    
  } catch (error) {
    console.error("[API] /inventory PUT - Error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}, { requireCompanyId: true });

// DELETE: Remove an inventory item
export const DELETE = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }
    
    // Ensure the item belongs to the user's company
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });
    
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    
    // Check if user has access to this item's company
    if (existingItem.companyId !== effectiveCompanyId && !isSuperAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("[API] /inventory DELETE - Error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}, { requireCompanyId: true }); 