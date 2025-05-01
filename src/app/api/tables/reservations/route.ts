import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/tables/reservations - Get all reservations for the current company
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

    // Check for query parameters
    const searchParams = req.nextUrl.searchParams;
    const requestCompanyId = searchParams.get("companyId");
    const tableId = searchParams.get("tableId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    
    // For superadmins, use the companyId from the request
    // For regular users, verify the requested companyId matches their profile companyId
    let companyId: string | null = null;
    
    if (profile.role === UserRole.SUPERADMIN) {
      companyId = requestCompanyId;
    } else {
      // For regular users, enforce using their assigned company
      companyId = profile.companyId;
      
      // If they're trying to access another company's data, reject
      if (requestCompanyId && requestCompanyId !== companyId) {
        return NextResponse.json(
          { error: "Unauthorized access to company data" },
          { status: 403 }
        );
      }
    }
    
    // Ensure companyId is not null before querying
    if (!companyId) {
      return NextResponse.json(
        { error: "No company context available" },
        { status: 400 }
      );
    }

    // Build where clause based on filters
    const where: any = { companyId };
    
    if (tableId) {
      where.tableId = tableId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (date) {
      const selectedDate = new Date(date);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      
      where.OR = [
        {
          // Reservations that start on the selected date
          reservedFrom: {
            gte: selectedDate,
            lt: nextDay,
          },
        },
        {
          // Reservations that end on the selected date
          reservedTo: {
            gte: selectedDate,
            lt: nextDay,
          },
        },
        {
          // Reservations that span over the selected date
          AND: [
            { reservedFrom: { lt: selectedDate } },
            { reservedTo: { gt: nextDay } }
          ]
        }
      ];
    }

    // Get reservations for the company
    const reservations = await db.tableReservation.findMany({
      where,
      include: {
        table: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { reservedFrom: "asc" },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST /api/tables/reservations - Create a new reservation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      tableId, 
      customerName, 
      customerPhone, 
      reservedFrom, 
      reservedTo, 
      status = "PENDING",
      companyId 
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    if (!tableId) {
      return NextResponse.json(
        { error: "Table ID is required" },
        { status: 400 }
      );
    }

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

    // Check permissions - Regular customers can create reservations,
    // but only for their own company
    if (profile.companyId !== companyId && profile.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: "Cannot create reservations for other companies" },
        { status: 403 }
      );
    }

    // Verify the company exists
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Verify the table exists
    const table = await db.table.findUnique({
      where: { id: tableId, companyId },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Check for conflicting reservations
    const conflictingReservations = await db.tableReservation.findMany({
      where: {
        tableId,
        status: { not: "CANCELLED" },
        OR: [
          // New reservation starts during an existing reservation
          {
            reservedFrom: { lte: new Date(reservedFrom) },
            reservedTo: { gt: new Date(reservedFrom) }
          },
          // New reservation ends during an existing reservation
          {
            reservedFrom: { lt: new Date(reservedTo) },
            reservedTo: { gte: new Date(reservedTo) }
          },
          // New reservation completely contains an existing reservation
          {
            reservedFrom: { gte: new Date(reservedFrom) },
            reservedTo: { lte: new Date(reservedTo) }
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

    // Create the reservation
    const reservation = await db.tableReservation.create({
      data: {
        tableId,
        companyId,
        customerName,
        customerPhone,
        reservedFrom: new Date(reservedFrom),
        reservedTo: new Date(reservedTo),
        status,
      },
    });

    // Create an activity log entry
    await db.tableActivityLog.create({
      data: {
        companyId,
        userId: profile.id,
        action: "CREATE",
        entityType: "RESERVATION",
        entityId: reservation.id,
        metadata: { 
          tableId,
          customerName,
          reservedFrom: new Date(reservedFrom).toISOString(),
          reservedTo: new Date(reservedTo).toISOString(),
        },
      },
    });

    return NextResponse.json(
      { reservation },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
} 