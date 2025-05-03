import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils";

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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
    
    // Get active table sessions for the company
    const activeSessions = await prisma.tableSession.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        endedAt: null,
      },
      include: {
        table: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });
    
    return NextResponse.json(activeSessions);
  } catch (error) {
    console.error("[GET_ACTIVE_SESSIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 