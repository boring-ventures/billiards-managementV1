import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/tables/sessions - Start a new session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, startedAt } = body;

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

    // Verify the table belongs to the user's company
    if (table.companyId !== profile.companyId) {
      return NextResponse.json(
        { error: "Table does not belong to your company" },
        { status: 403 }
      );
    }

    // Check if the table is already in an active session
    const activeSession = await db.tableSession.findFirst({
      where: {
        tableId,
        endedAt: null,
      },
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "Table already has an active session" },
        { status: 400 }
      );
    }

    // Start a new session
    const newSession = await db.tableSession.create({
      data: {
        companyId: table.companyId,
        tableId,
        staffId: profile.id,
        startedAt: new Date(startedAt),
      },
    });

    // Update the table status to BUSY
    await db.table.update({
      where: { id: tableId },
      data: { status: "BUSY" },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: table.companyId,
        userId: profile.id,
        action: "START_SESSION",
        entityType: "TABLE_SESSION",
        entityId: newSession.id,
        metadata: { tableId, tableName: table.name },
      },
    });

    return NextResponse.json(
      { session: newSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
} 