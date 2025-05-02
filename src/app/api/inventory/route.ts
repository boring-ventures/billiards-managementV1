import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET: Fetch all inventory items for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    
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

    // For non-superadmins, companyId is required
    if (!isSuperAdmin && !companyId && !profile.companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }
    
    // For superadmins without companyId, get all items across companies
    let where: any = {};
    
    if (companyId) {
      where = { companyId };
    } else if (!isSuperAdmin && profile?.companyId) {
      where = { companyId: profile.companyId };
    }
    
    // Log the query we're about to execute
    console.log("Inventory query:", { 
      isSuperAdmin, 
      requestCompanyId: companyId,
      profileCompanyId: profile.companyId,
      whereClause: where 
    });

    // Get inventory items with their categories
    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          }
        }
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
  companyId: z.string().uuid().optional(),
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
    const session = await auth();
    
    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile to check role
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Verify admin permissions
    if (!profile || (profile.role.toString() !== "ADMIN" && profile.role.toString() !== "SUPERADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Parse input
    const body = await request.json();
    
    // For superadmins, companyId is required in the request
    // For regular admins, use their own companyId and ignore the request
    let companyId = body.companyId;
    const isSuperAdmin = profile.role.toString() === "SUPERADMIN";
    
    if (isSuperAdmin) {
      if (!companyId) {
        return NextResponse.json(
          { error: "Company ID is required for superadmins", isSuperAdmin: true },
          { status: 400 }
        );
      }
      
      // Verify the company exists
      const companyExists = await prisma.company.findUnique({
        where: { id: companyId },
      });
      
      if (!companyExists) {
        return NextResponse.json(
          { error: "Company not found", isSuperAdmin: true },
          { status: 404 }
        );
      }
    } else {
      // For regular admins, always use their assigned company
      if (!profile.companyId) {
        return NextResponse.json(
          { error: "No company associated with admin" },
          { status: 400 }
        );
      }
      
      companyId = profile.companyId;
    }
    
    // Update body with correct companyId
    const updatedBody = { ...body, companyId };
    
    // Validate input
    const result = inventoryItemSchema.safeParse(updatedBody);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format(), isSuperAdmin },
        { status: 400 }
      );
    }
    
    const data = result.data;
    
    // Make sure we have a companyId when creating the record
    if (!data.companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }
    
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