import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/tables - Get tables for the current company
export async function GET(req: NextRequest) {
  try {
    // Get the current user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the profile, which includes the company ID
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // For superadmins, check for a selected company in the request
    let companyId = profile.companyId;
    
    if (profile.role === UserRole.SUPERADMIN && !companyId) {
      const searchParams = req.nextUrl.searchParams;
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

    // Get tables for the company with their active sessions
    const tables = await db.table.findMany({
      where: { companyId },
      include: {
        sessions: {
          where: { endedAt: null },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

// POST /api/tables - Create a new table
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, hourlyRate, status, companyId } = body;

    // Get the current user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the profile, which includes the role
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if the user is an admin or superadmin
    if (
      profile.role !== UserRole.ADMIN &&
      profile.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json(
        { error: "Only admins can create tables" },
        { status: 403 }
      );
    }

    // Create the table
    const newTable = await db.table.create({
      data: {
        name,
        hourlyRate,
        status: status || "AVAILABLE",
        companyId,
      },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId,
        userId: profile.id,
        action: "CREATE",
        entityType: "TABLE",
        entityId: newTable.id,
        metadata: { name, hourlyRate, status },
      },
    });

    return NextResponse.json(
      { table: newTable },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
} 