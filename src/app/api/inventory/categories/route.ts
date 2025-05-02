import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getEffectiveCompanyId } from "../../utils/superadminAccess";

// GET: Fetch all inventory categories for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");
    
    console.log("[API] /inventory/categories GET - companyIdParam:", companyIdParam);
    
    // Get the user's session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile to check role
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    console.log("[API] /inventory/categories GET - User profile:", {
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
    
    console.log("[API] /inventory/categories GET - Using effectiveCompanyId:", effectiveCompanyId);

    // Get inventory categories
    const categories = await prisma.inventoryCategory.findMany({
      where: {
        companyId: effectiveCompanyId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(categories);
    
  } catch (error) {
    console.error("[API] /inventory/categories GET - Error:", error);
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { companyId: companyIdParam, ...categoryData } = body;
    
    // Get the effective company ID based on user role
    const effectiveCompanyId = await getEffectiveCompanyId(session.user.id, companyIdParam);
    
    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Create the category
    const category = await prisma.inventoryCategory.create({
      data: {
        ...categoryData,
        companyId: effectiveCompanyId,
      },
    });

    return NextResponse.json(category);
    
  } catch (error) {
    console.error("[API] /inventory/categories POST - Error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory category" },
      { status: 500 }
    );
  }
} 