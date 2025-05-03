import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const orderSchema = z.object({
  companyId: z.string(),
  tableSessionId: z.string().optional(),
  items: z.array(
    z.object({
      inventoryItemId: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive(),
    })
  ),
  total: z.number().positive(),
  staffId: z.string(),
});

export async function GET(req: NextRequest) {
  try {
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
    
    // Extract companyId from query params
    const searchParams = req.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");
    
    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
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
    
    // Get orders for the company, ordered by most recent first
    const orders = await prisma.posOrder.findMany({
      where: {
        companyId,
      },
      include: {
        orderItems: true,
        tableSession: {
          include: {
            table: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to avoid too much data
    });
    
    return NextResponse.json(orders);
  } catch (error) {
    console.error("[GET_ORDERS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = orderSchema.parse(body);
    
    // Get user profile to check role and company access
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: { company: true }
    });
    
    // Verify the user has access to this company
    const isSuperadmin = profile?.role === UserRole.SUPERADMIN;
    const isAssignedToCompany = profile?.companyId === validatedData.companyId;
    
    if (!profile || (!isSuperadmin && !isAssignedToCompany)) {
      return NextResponse.json(
        { error: "Unauthorized to access this company" },
        { status: 403 }
      );
    }

    // Create order and order items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.posOrder.create({
        data: {
          companyId: validatedData.companyId,
          tableSessionId: validatedData.tableSessionId,
          totalAmount: validatedData.total,
          staffId: validatedData.staffId,
          orderNumber: generateOrderNumber(),
        },
      });

      // Create order items
      await Promise.all(
        validatedData.items.map((item) =>
          tx.posOrderItem.create({
            data: {
              orderId: order.id,
              itemId: item.inventoryItemId,
              quantity: item.quantity,
              unitPrice: item.price,
              lineTotal: item.price * item.quantity,
            },
          })
        )
      );

      // Create inventory transactions for each item
      await Promise.all(
        validatedData.items.map((item) =>
          tx.inventoryTransaction.create({
            data: {
              companyId: validatedData.companyId,
              itemId: item.inventoryItemId,
              quantityDelta: -item.quantity, // Negative for outgoing
              transactionType: "OUTGOING",
              note: `POS Order: ${order.id}`,
              staffId: profile.id,
            },
          })
        )
      );

      // Update inventory item stock
      await Promise.all(
        validatedData.items.map((item) =>
          tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          })
        )
      );

      return order;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("[POS_ORDER_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to generate a unique order number
function generateOrderNumber(): string {
  const timestamp = new Date().getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `POS-${timestamp}${random}`;
} 