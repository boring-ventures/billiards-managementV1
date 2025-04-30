import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET: List staff members for a company
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
    const role = searchParams.get("role"); // admin, seller, all
    
    // Validate company ID
    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }
    
    // Check if user has access to this company
    const userProfile = await prisma.profile.findFirst({
      where: {
        userId: session.user.id,
        companyId,
      },
    });
    
    if (!userProfile || (userProfile.role !== UserRole.ADMIN && userProfile.role !== UserRole.SUPERADMIN)) {
      return NextResponse.json({ error: "Unauthorized access to staff data" }, { status: 403 });
    }
    
    // Build filters
    const whereClause: any = {
      companyId,
      active: true,
    };
    
    // Filter by role if specified
    if (role === "admin") {
      whereClause.role = {
        in: [UserRole.ADMIN, UserRole.SUPERADMIN],
      };
    } else if (role === "seller") {
      whereClause.role = UserRole.SELLER;
    }
    
    // Get staff list
    const staff = await prisma.profile.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });
    
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
} 