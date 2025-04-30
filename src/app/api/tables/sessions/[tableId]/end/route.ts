import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateSessionDuration, calculateSessionCost } from "@/lib/tableUtils";

// PATCH /api/tables/sessions/[tableId]/end - End an active session
export async function PATCH(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const { tableId } = params;
    const body = await req.json();
    const { endedAt } = body;

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

    // Find the active session for this table
    const activeSession = await db.tableSession.findFirst({
      where: {
        tableId,
        endedAt: null,
      },
      include: {
        table: true,
      },
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: "No active session found for this table" },
        { status: 404 }
      );
    }

    // Verify the session belongs to the user's company
    if (activeSession.companyId !== profile.companyId) {
      return NextResponse.json(
        { error: "Session does not belong to your company" },
        { status: 403 }
      );
    }

    // Calculate the session duration in minutes
    const endTime = new Date(endedAt);
    const durationMin = calculateSessionDuration({
      ...activeSession,
      endedAt: endTime,
    });

    // Calculate the session cost
    const totalCost = calculateSessionCost({
      ...activeSession,
      endedAt: endTime,
    }, activeSession.table);

    // End the session
    const updatedSession = await db.tableSession.update({
      where: { id: activeSession.id },
      data: {
        endedAt: endTime,
        durationMin,
        totalCost,
        status: "CLOSED",
      },
    });

    // Update the table status back to AVAILABLE
    await db.table.update({
      where: { id: tableId },
      data: { status: "AVAILABLE" },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: activeSession.companyId,
        userId: profile.id,
        action: "END_SESSION",
        entityType: "TABLE_SESSION",
        entityId: activeSession.id,
        metadata: {
          tableId,
          tableName: activeSession.table.name,
          duration: durationMin,
          cost: totalCost,
        },
      },
    });

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
} 