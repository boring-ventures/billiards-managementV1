import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getEffectiveCompanyId } from "../utils/superadminAccess";

// GET: Fetch all inventory items for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");
    
    // Log debugging information
    console.log("[API] /inventory GET - companyIdParam:", companyIdParam);
    
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile information
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Log debugging information
    console.log("[API] /inventory GET - User profile:", {
      id: profile?.id,
      userId: profile?.userId,
      role: profile?.role,
      companyId: profile?.companyId,
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Get the effective company ID based on user role
    const effectiveCompanyId = await getEffectiveCompanyId(session.user.id, companyIdParam);
    
    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }
    
    console.log("[API] /inventory GET - Using effectiveCompanyId:", effectiveCompanyId);

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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId: companyIdParam, ...itemData } = body;
    
    // Get the effective company ID based on user role
    const effectiveCompanyId = await getEffectiveCompanyId(session.user.id, companyIdParam);
    
    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

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
} 