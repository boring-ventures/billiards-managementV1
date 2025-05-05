import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { withAuth } from "@/lib/auth-server-utils";

// GET /api/tables - Get tables for the current company
export const GET = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    // Check if this is a superadmin with no company context and requesting all tables
    if (isSuperAdmin && !effectiveCompanyId) {
      // Get all tables grouped by company
      const allTables = await db.table.findMany({
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          sessions: {
            where: { endedAt: null },
          },
        },
        orderBy: { name: "asc" },
      });
      
      return NextResponse.json({ tables: allTables });
    }
    
    // Ensure company context is available for table lookup
    if (!effectiveCompanyId) {
      return NextResponse.json(
        { error: "No company context available" },
        { status: 400 }
      );
    }

    // Get tables for the company with their active sessions
    const tables = await db.table.findMany({
      where: { companyId: effectiveCompanyId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
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
}, { requireCompanyId: false }); // Not requiring company ID allows superadmins to fetch all tables

// POST /api/tables - Create a new table
export const POST = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const body = await req.json();
    const { name, hourlyRate, status, companyId: requestedCompanyId } = body;

    // For regular users, we use their effectiveCompanyId
    // For superadmins, they can specify a company
    const targetCompanyId = isSuperAdmin && requestedCompanyId ? requestedCompanyId : effectiveCompanyId;
    
    if (!targetCompanyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Get the user profile for logging purposes
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, role: true }
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if the user is an admin or superadmin
    const canCreateTables = profile.role === UserRole.ADMIN || 
                           profile.role === UserRole.SUPERADMIN;
                           
    if (!canCreateTables) {
      return NextResponse.json(
        { error: "Only admins can create tables" },
        { status: 403 }
      );
    }

    // Verify the company exists
    const company = await db.company.findUnique({
      where: { id: targetCompanyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Create the table
    const newTable = await db.table.create({
      data: {
        name,
        hourlyRate,
        status: status || "AVAILABLE",
        companyId: targetCompanyId,
      },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: targetCompanyId,
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
}, { requireCompanyId: false }); // Not requiring allows superadmins to create tables for any company

// PUT /api/tables/:id - Update a table
export const PUT = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const body = await req.json();
    const { id, name, hourlyRate, status } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: "Table ID is required" },
        { status: 400 }
      );
    }
    
    // Fetch the table to check ownership
    const table = await db.table.findUnique({
      where: { id },
    });
    
    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update this table
    // Must be admin/superadmin and either superadmin or belongs to the same company
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, role: true, companyId: true },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }
    
    const isAdmin = profile.role === UserRole.ADMIN || profile.role === UserRole.SUPERADMIN;
    const hasCompanyAccess = isSuperAdmin || table.companyId === effectiveCompanyId;
    
    if (!isAdmin || !hasCompanyAccess) {
      return NextResponse.json(
        { error: "You don't have permission to update this table" },
        { status: 403 }
      );
    }
    
    // Update the table
    const updatedTable = await db.table.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        hourlyRate: hourlyRate !== undefined ? hourlyRate : undefined,
        status: status !== undefined ? status : undefined,
      },
    });
    
    // Create activity log
    await db.tableActivityLog.create({
      data: {
        companyId: table.companyId,
        userId: profile.id,
        action: "UPDATE",
        entityType: "TABLE",
        entityId: table.id,
        metadata: { 
          name: name !== undefined ? name : undefined,
          hourlyRate: hourlyRate !== undefined ? hourlyRate : undefined,
          status: status !== undefined ? status : undefined
        },
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
}, { requireCompanyId: false });  // Not requiring allows superadmins to update any table

// DELETE /api/tables/:id - Delete a table
export const DELETE = withAuth(async (req, { user, isSuperAdmin, effectiveCompanyId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Table ID is required" },
        { status: 400 }
      );
    }
    
    // Fetch the table to check ownership
    const table = await db.table.findUnique({
      where: { id },
    });
    
    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }
    
    // Check if user has permission to delete this table
    // Must be admin/superadmin and either superadmin or belongs to the same company
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, role: true },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }
    
    const isAdmin = profile.role === UserRole.ADMIN || profile.role === UserRole.SUPERADMIN;
    const hasCompanyAccess = isSuperAdmin || table.companyId === effectiveCompanyId;
    
    if (!isAdmin || !hasCompanyAccess) {
      return NextResponse.json(
        { error: "You don't have permission to delete this table" },
        { status: 403 }
      );
    }
    
    // Check for active sessions on this table
    const activeSessions = await db.tableSession.count({
      where: {
        tableId: id,
        endedAt: null,
      },
    });
    
    if (activeSessions > 0) {
      return NextResponse.json(
        { error: "Cannot delete table with active sessions" },
        { status: 400 }
      );
    }
    
    // Delete the table
    await db.table.delete({
      where: { id },
    });
    
    // Create activity log
    await db.tableActivityLog.create({
      data: {
        companyId: table.companyId,
        userId: profile.id,
        action: "DELETE",
        entityType: "TABLE",
        entityId: table.id,
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}, { requireCompanyId: false }); // Not requiring allows superadmins to delete any table 