import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// Schema for company creation/update
const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Function to check if user has super admin role
async function checkSuperAdminRole(userId: string) {
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { role: true },
    });
    
    // More robust check for superadmin role
    const isSuperAdmin = profile && (
      profile.role === "SUPERADMIN" || 
      String(profile.role).toUpperCase() === "SUPERADMIN"
    );
    
    console.log("API:companies - Checking superadmin status", {
      userId,
      role: profile?.role,
      isSuperAdmin
    });
    
    return isSuperAdmin;
  } catch (error) {
    console.error("Failed to check user role:", error);
    return false;
  }
}

// GET: Fetch all companies for superadmin
export async function GET(_request: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient();

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user profile to check role
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    console.log("API:companies:GET - User profile:", {
      userId,
      role: profile?.role
    });

    // Check if user is a superadmin
    const isSuperAdmin = profile && (
      profile.role === "SUPERADMIN" || 
      String(profile.role).toUpperCase() === "SUPERADMIN"
    );

    console.log("API:companies:GET - Is superadmin:", isSuperAdmin);

    // Only superadmin can see all companies
    if (!profile || !isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Only superadmins can access all companies" },
        { status: 403 }
      );
    }

    // Fetch all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin role
    const isSuperAdmin = await checkSuperAdminRole(session.user.id);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Requires super admin access" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = companySchema.parse(body);

    const company = await db.company.create({
      data: {
        name: validatedData.name,
        address: validatedData.address,
        phone: validatedData.phone,
      },
    });

    // Optionally assign this company to the superadmin who created it
    const assignToCreator = body.assignToCreator === true;
    
    if (assignToCreator) {
      // Update the superadmin's profile with the new company ID
      await db.profile.update({
        where: { userId: session.user.id },
        data: { companyId: company.id },
      });
      
      // Indicate that the company was assigned
      return NextResponse.json({ 
        ...company, 
        assigned: true,
        message: "Company created and assigned to your profile" 
      });
    }

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("[COMPANIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
