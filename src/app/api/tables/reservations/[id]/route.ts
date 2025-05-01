import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/tables/reservations/[id] - Get a specific reservation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;

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

    // Get the reservation
    const reservation = await db.tableReservation.findUnique({
      where: { id: reservationId },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to access this reservation
    if (
      profile.companyId !== reservation.companyId &&
      profile.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to reservation data" },
        { status: 403 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}

// PATCH /api/tables/reservations/[id] - Update a reservation
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;
    const body = await req.json();
    const { 
      customerName, 
      customerPhone, 
      reservedFrom, 
      reservedTo, 
      status 
    } = body;

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

    // Get the existing reservation
    const existingReservation = await db.tableReservation.findUnique({
      where: { id: reservationId },
    });

    if (!existingReservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to update this reservation
    if (
      profile.companyId !== existingReservation.companyId &&
      profile.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json(
        { error: "Unauthorized to update this reservation" },
        { status: 403 }
      );
    }

    // Check for conflicting reservations if times are changing
    let conflictCheck = false;
    if (
      (reservedFrom && new Date(reservedFrom).toString() !== existingReservation.reservedFrom.toString()) ||
      (reservedTo && new Date(reservedTo).toString() !== existingReservation.reservedTo.toString())
    ) {
      // Only check for conflicts if we're not cancelling the reservation
      if (status !== "CANCELLED") {
        const newFrom = reservedFrom ? new Date(reservedFrom) : existingReservation.reservedFrom;
        const newTo = reservedTo ? new Date(reservedTo) : existingReservation.reservedTo;
        
        const conflictingReservations = await db.tableReservation.findMany({
          where: {
            tableId: existingReservation.tableId,
            id: { not: reservationId }, // Exclude current reservation
            status: { not: "CANCELLED" },
            OR: [
              // New reservation starts during an existing reservation
              {
                reservedFrom: { lte: newFrom },
                reservedTo: { gt: newFrom }
              },
              // New reservation ends during an existing reservation
              {
                reservedFrom: { lt: newTo },
                reservedTo: { gte: newTo }
              },
              // New reservation completely contains an existing reservation
              {
                reservedFrom: { gte: newFrom },
                reservedTo: { lte: newTo }
              }
            ]
          }
        });

        if (conflictingReservations.length > 0) {
          return NextResponse.json(
            { 
              error: "This table is already reserved during this time period",
              conflicts: conflictingReservations
            },
            { status: 409 }
          );
        }
      }
    }

    // Update the reservation
    const updateData: any = {};
    if (customerName !== undefined) updateData.customerName = customerName;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (reservedFrom) updateData.reservedFrom = new Date(reservedFrom);
    if (reservedTo) updateData.reservedTo = new Date(reservedTo);
    if (status) updateData.status = status;

    const updatedReservation = await db.tableReservation.update({
      where: { id: reservationId },
      data: updateData,
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: existingReservation.companyId,
        userId: profile.id,
        action: "UPDATE",
        entityType: "RESERVATION",
        entityId: reservationId,
        metadata: { 
          tableId: existingReservation.tableId,
          customerName: updatedReservation.customerName,
          previousStatus: existingReservation.status,
          newStatus: updatedReservation.status,
          changes: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({ reservation: updatedReservation });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 }
    );
  }
}

// DELETE /api/tables/reservations/[id] - Delete a reservation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;

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

    // Get the existing reservation
    const existingReservation = await db.tableReservation.findUnique({
      where: { id: reservationId },
    });

    if (!existingReservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to delete this reservation
    if (
      profile.companyId !== existingReservation.companyId &&
      profile.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json(
        { error: "Unauthorized to delete this reservation" },
        { status: 403 }
      );
    }

    // Delete the reservation
    await db.tableReservation.delete({
      where: { id: reservationId },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId: existingReservation.companyId,
        userId: profile.id,
        action: "DELETE",
        entityType: "RESERVATION",
        entityId: reservationId,
        metadata: { 
          tableId: existingReservation.tableId,
          customerName: existingReservation.customerName,
          reservedFrom: existingReservation.reservedFrom.toISOString(),
          reservedTo: existingReservation.reservedTo.toISOString(),
        },
      },
    });

    return NextResponse.json(
      { message: "Reservation deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Failed to delete reservation" },
      { status: 500 }
    );
  }
} 