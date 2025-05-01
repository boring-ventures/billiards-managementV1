import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET: Fetch all inventory categories for a company
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

    // Get inventory categories
    const categories = await prisma.inventoryCategory.findMany({
      where: {
        companyId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory categories" },
      { status: 500 }
    );
  }
}

// Validation schema for creating/updating inventory categories
const categorySchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
});

// POST: Create a new inventory category
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
    
    // Parse and validate input
    const body = await request.json();
    const result = categorySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const data = result.data;
    
    // Check if category with same name already exists
    const existingCategory = await prisma.inventoryCategory.findFirst({
      where: {
        companyId: data.companyId,
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }
    
    // Create the category
    const newCategory = await prisma.inventoryCategory.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        description: data.description,
      },
    });
    
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory category:", error);
    return NextResponse.json(
      { error: "Failed to create inventory category" },
      { status: 500 }
    );
  }
} 