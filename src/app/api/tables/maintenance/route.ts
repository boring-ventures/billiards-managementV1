import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// POST /api/tables/maintenance - Create a new maintenance record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, companyId, description, maintenanceAt, cost } = body;

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
        { error: "Only admins can schedule maintenance" },
        { status: 403 }
      );
    }

    // Create the maintenance record
    const maintenance = await db.tableMaintenance.create({
      data: {
        tableId,
        companyId,
        description,
        maintenanceAt: new Date(maintenanceAt),
        cost,
      },
    });

    // Update the table status to MAINTENANCE
    await db.table.update({
      where: { id: tableId },
      data: { status: "MAINTENANCE" },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId,
        userId: profile.id,
        action: "MAINTENANCE_SCHEDULED",
        entityType: "TABLE",
        entityId: tableId,
        metadata: { description, maintenanceAt, cost },
      },
    });

    return NextResponse.json(
      { maintenance },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error scheduling maintenance:", error);
    return NextResponse.json(
      { error: "Failed to schedule maintenance" },
      { status: 500 }
    );
  }
}

// GET /api/tables/maintenance - Get maintenance records
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

    // Parse table ID from query parameters (if provided)
    const searchParams = req.nextUrl.searchParams;
    const tableId = searchParams.get("tableId");

    // Build the query
    const whereClause: any = { companyId };
    if (tableId) {
      whereClause.tableId = tableId;
    }

    // Get maintenance records
    const maintenanceRecords = await db.tableMaintenance.findMany({
      where: whereClause,
      include: {
        table: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { maintenanceAt: "desc" },
    });

    return NextResponse.json({ maintenanceRecords });
  } catch (error) {
    console.error("Error fetching maintenance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance records" },
      { status: 500 }
    );
  }
} 