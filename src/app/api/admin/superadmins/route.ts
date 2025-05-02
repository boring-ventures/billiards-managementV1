import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET: Fetch all superadmin users from the database
 * This endpoint is used by the user-switcher component
 */
export async function GET() {
  try {
    // Fetch all users with SUPERADMIN role
    const superadmins = await prisma.profile.findMany({
      where: {
        role: UserRole.SUPERADMIN,
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return NextResponse.json({ superadmins });
  } catch (error) {
    console.error("[API] /admin/superadmins GET - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch superadmin users" },
      { status: 500 }
    );
  }
} 