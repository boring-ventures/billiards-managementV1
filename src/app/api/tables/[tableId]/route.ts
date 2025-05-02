import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/tables/[tableId] - Get a single table
export async function GET(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const { tableId } = params;

    // Get the current user's session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user profile
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Get companyId from query params for superadmins, otherwise use profile companyId
    const searchParams = req.nextUrl.searchParams;
    const requestCompanyId = searchParams.get("companyId");
    
    // For superadmins, use the companyId from the request if provided
    // For regular users, always use their assigned company
    let effectiveCompanyId: string | null = null;
    
    if (profile.role === UserRole.SUPERADMIN) {
      // Superadmin can specify a company ID or use their assigned one
      effectiveCompanyId = requestCompanyId || profile.companyId;
    } else {
      // Regular users must use their assigned company
      effectiveCompanyId = profile.companyId;
      
      // Reject if they're trying to access another company's data
      if (requestCompanyId && requestCompanyId !== effectiveCompanyId) {
        return NextResponse.json(
          { error: "Unauthorized access to company data" },
          { status: 403 }
        );
      }
    }

    // Get the table with its current sessions
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        sessions: {
          where: { endedAt: null },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // For non-superadmins, verify the table belongs to the user's company
    if (profile.role !== UserRole.SUPERADMIN && table.companyId !== effectiveCompanyId) {
      return NextResponse.json(
        { error: "Table does not belong to your company" },
        { status: 403 }
      );
    }
    
    // For superadmins with a specified company, also verify the table belongs to that company
    if (profile.role === UserRole.SUPERADMIN && effectiveCompanyId && table.companyId !== effectiveCompanyId) {
      return NextResponse.json(
        { error: "Table does not belong to the specified company" },
        { status: 403 }
      );
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

// PATCH /api/tables/[tableId] - Update a table
export async function PATCH(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const { tableId } = params;
    const body = await req.json();
    const { name, hourlyRate, status } = body;

    // Get the current user's session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user profile with role information
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
        { error: "Only admins can update tables" },
        { status: 403 }
      );
    }

    // Get companyId from query params for superadmins, otherwise use profile companyId
    const searchParams = req.nextUrl.searchParams;
    const requestCompanyId = searchParams.get("companyId");
    
    // For superadmins, use the companyId from the request if provided
    // For regular users, always use their assigned company
    let effectiveCompanyId: string | null = null;
    
    if (profile.role === UserRole.SUPERADMIN) {
      // Superadmin can specify a company ID or use their assigned one
      effectiveCompanyId = requestCompanyId || profile.companyId;
    } else {
      // Regular users must use their assigned company
      effectiveCompanyId = profile.companyId;
      
      // Reject if they're trying to access another company's data
      if (requestCompanyId && requestCompanyId !== effectiveCompanyId) {
        return NextResponse.json(
          { error: "Unauthorized access to company data" },
          { status: 403 }
        );
      }
    }

    // Get the table to verify it exists and belongs to the user's company
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        sessions: {
          where: { endedAt: null },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // For non-superadmins, verify the table belongs to the user's company
    if (profile.role !== UserRole.SUPERADMIN && table.companyId !== effectiveCompanyId) {
      return NextResponse.json(
        { error: "Table does not belong to your company" },
        { status: 403 }
      );
    }
    
    // For superadmins with a specified company, also verify the table belongs to that company
    if (profile.role === UserRole.SUPERADMIN && effectiveCompanyId && table.companyId !== effectiveCompanyId) {
      return NextResponse.json(
        { error: "Table does not belong to the specified company" },
        { status: 403 }
      );
    }

    // If the table has an active session, we can't change the status
    const hasActiveSession = table.sessions.length > 0;
    
    // Prepare update data
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    
    // Only update status if there's no active session
    if (status && !hasActiveSession) {
      updateData.status = status;
    } else if (status && hasActiveSession && status !== table.status) {
      return NextResponse.json(
        { error: "Cannot change status of a table with an active session" },
        { status: 400 }
      );
    }

    // Update the table
    const updatedTable = await db.table.update({
      where: { id: tableId },
      data: updateData,
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: table.companyId,
        userId: profile.id,
        action: "UPDATE",
        entityType: "TABLE",
        entityId: tableId,
        metadata: updateData,
      },
    });

    return NextResponse.json({ table: updatedTable });
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

// DELETE /api/tables/[tableId] - Delete a table
export async function DELETE(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const { tableId } = params;

    // Get the current user's session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user profile with role information
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
        { error: "Only admins can delete tables" },
        { status: 403 }
      );
    }

    // Get companyId from query params for superadmins, otherwise use profile companyId
    const searchParams = req.nextUrl.searchParams;
    const requestCompanyId = searchParams.get("companyId");
    
    // For superadmins, use the companyId from the request if provided
    // For regular users, always use their assigned company
    let effectiveCompanyId: string | null = null;
    
    if (profile.role === UserRole.SUPERADMIN) {
      // Superadmin can specify a company ID or use their assigned one
      effectiveCompanyId = requestCompanyId || profile.companyId;
    } else {
      // Regular users must use their assigned company
      effectiveCompanyId = profile.companyId;
      
      // Reject if they're trying to access another company's data
      if (requestCompanyId && requestCompanyId !== effectiveCompanyId) {
        return NextResponse.json(
          { error: "Unauthorized access to company data" },
          { status: 403 }
        );
      }
    }

    // Get the table to verify it exists and belongs to the user's company
    const table = await db.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // For non-superadmins, verify the table belongs to the user's company
    if (profile.role !== UserRole.SUPERADMIN && table.companyId !== effectiveCompanyId) {
      return NextResponse.json(
        { error: "Table does not belong to your company" },
        { status: 403 }
      );
    }
    
    // For superadmins with a specified company, also verify the table belongs to that company
    if (profile.role === UserRole.SUPERADMIN && effectiveCompanyId && table.companyId !== effectiveCompanyId) {
      return NextResponse.json(
        { error: "Table does not belong to the specified company" },
        { status: 403 }
      );
    }

    // Check if the table has any active sessions
    const activeSession = await db.tableSession.findFirst({
      where: {
        tableId,
        endedAt: null,
      },
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "Cannot delete a table with an active session" },
        { status: 400 }
      );
    }

    // Delete the table
    await db.table.delete({
      where: { id: tableId },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: table.companyId,
        userId: profile.id,
        action: "DELETE",
        entityType: "TABLE",
        entityId: tableId,
        metadata: {
          tableName: table.name,
        },
      },
    });

    return NextResponse.json(
      { message: "Table deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
} 