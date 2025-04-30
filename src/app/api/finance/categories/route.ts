import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { assertFinanceAccess } from "@/lib/financeUtils";

/**
 * GET: List all finance categories for a company
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    
    // Validate company ID
    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }
    
    // Check if user has access to this company's finance data
    try {
      await assertFinanceAccess(companyId, session.user.id);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized access to finance data" }, { status: 403 });
    }
    
    // Get all categories for the company
    const categories = await prisma.financeCategory.findMany({
      where: {
        companyId,
      },
      orderBy: {
        name: "asc",
      },
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

/**
 * POST: Create a new finance category
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get request body
    const data = await request.json();
    const { companyId, name, categoryType } = data;
    
    // Validate required fields
    if (!companyId || !name || !categoryType) {
      return NextResponse.json({ 
        error: "Missing required fields: companyId, name, categoryType" 
      }, { status: 400 });
    }
    
    // Check if user has access to this company's finance data
    try {
      await assertFinanceAccess(companyId, session.user.id);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized access to finance data" }, { status: 403 });
    }
    
    // Check if category name already exists for this company and type
    const existingCategory = await prisma.financeCategory.findFirst({
      where: {
        companyId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
        categoryType,
      },
    });
    
    if (existingCategory) {
      return NextResponse.json({ 
        error: "A category with this name already exists" 
      }, { status: 400 });
    }
    
    // Create category
    const newCategory = await prisma.financeCategory.create({
      data: {
        companyId,
        name,
        categoryType,
      },
    });
    
    return NextResponse.json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
} 