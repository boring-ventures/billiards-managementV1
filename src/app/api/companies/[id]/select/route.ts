import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user - using getUser() instead of getSession() as recommended
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = data.user.id;

    // Fetch user profile to check role
    const profile = await db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Only superadmin can select any company
    if (profile.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: "Unauthorized: Only superadmins can select any company" },
        { status: 403 }
      );
    }

    // Verify the company exists
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Update the profile with the selected company
    const updatedProfile = await db.profile.update({
      where: { userId },
      data: { companyId },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Company selected successfully",
      profile: updatedProfile
    });
  } catch (error) {
    console.error("Error selecting company:", error);
    return NextResponse.json(
      { error: "Failed to select company" },
      { status: 500 }
    );
  }
} 