import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils";

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile to check role and company access
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    
    // Verify the user has access to this company
    const isSuperadmin = profile?.role === UserRole.SUPERADMIN;
    const isAssignedToCompany = profile?.companyId === companyId;
    
    if (!profile || (!isSuperadmin && !isAssignedToCompany)) {
      return NextResponse.json(
        { error: "Unauthorized to access this company" },
        { status: 403 }
      );
    }

    // Fetch the order with related items
    const order = await prisma.posOrder.findUnique({
      where: {
        id,
        companyId,
      },
      include: {
        orderItems: true,
        tableSession: {
          include: {
            table: true,
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Transform the data to a more usable format for the frontend
    const transformedOrder = {
      id: order.id,
      createdAt: order.createdAt,
      total: order.totalAmount,
      companyId: order.companyId,
      items: order.orderItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.priceAtPurchase,
        quantity: item.quantity,
      })),
      tableSession: order.tableSession
        ? {
            id: order.tableSession.id,
            tableName: order.tableSession.table.name,
          }
        : null,
      staff: {
        id: order.staffId,
        name: order.staff?.user?.name || "Unknown",
      },
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error("[GET_POS_ORDER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 