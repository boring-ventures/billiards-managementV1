import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FinanceCategoryType, UserRole } from "@prisma/client";

/**
 * GET: List all finance categories for a company
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile with company information
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    
    // Get the profile, which includes the company ID
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // For superadmins, check for a selected company in the request
    let companyId = profile.companyId;
    
    if (profile.role === UserRole.SUPERADMIN && !companyId) {
      const searchParams = new URL(request.url).searchParams;
      const selectedCompanyId = searchParams.get("companyId");
      
      if (!selectedCompanyId) {
        return NextResponse.json(
          { error: "Company ID is required for superadmins" },
          { status: 400 }
        );
      }
      
      companyId = selectedCompanyId;
    }
    
    // Ensure companyId is not null before querying
    if (!companyId) {
      return NextResponse.json(
        { error: "No company context available" },
        { status: 400 }
      );
    }
    
    // Get all categories for the company
    const categories = await db.financeCategory.findMany({
      where: {
        companyId,
      },
      orderBy: {
        name: "asc",
      },
    });
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST: Create a new finance category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile with company information
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    
    // Get the profile, which includes the company ID
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Check if user has admin permissions
    if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Only admins can create categories" }, { status: 403 });
    }
    
    // Get request body
    const data = await request.json();
    const { name, categoryType } = data;
    
    // Validate required fields
    if (!name || !Object.values(FinanceCategoryType).includes(categoryType)) {
      return NextResponse.json({ 
        error: "Missing or invalid required fields: name, categoryType" 
      }, { status: 400 });
    }
    
    const companyId = profile.companyId;
    
    if (!companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }
    
    // Check if category name already exists for this company and type
    const existingCategory = await db.financeCategory.findFirst({
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
    const newCategory = await db.financeCategory.create({
      data: {
        companyId,
        name,
        categoryType,
      },
    });
    
    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 