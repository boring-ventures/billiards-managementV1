import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// Schema for company update
const companyUpdateSchema = z.object({
  name: z.string().min(1, "Company name is required").optional(),
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
    return profile?.role === UserRole.SUPERADMIN;
  } catch (error) {
    console.error("Failed to check user role:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
    const profile = await db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has access to the company
    const hasAccess =
      profile.role === UserRole.SUPERADMIN || profile.companyId === id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to access this company" },
        { status: 403 }
      );
    }

    // Fetch the company
    const company = await db.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Ensure params.id is available
  const companyId = params.id;

  try {
    const supabase = createRouteHandlerClient({ cookies });
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
    const validatedData = companyUpdateSchema.parse(body);

    // Check if company exists
    const existingCompany = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: validatedData,
    });

    return NextResponse.json(updatedCompany);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("[COMPANY_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Ensure params.id is available
  const companyId = params.id;

  try {
    const supabase = createRouteHandlerClient({ cookies });
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

    // Check if company exists
    const existingCompany = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Delete the company
    await db.company.delete({
      where: { id: companyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COMPANY_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
