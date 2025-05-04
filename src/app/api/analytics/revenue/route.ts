import { NextRequest, NextResponse } from "next/server";
import { createAPIRouteClient } from "@/lib/auth-server-utils";
import { getEffectiveCompanyId, isSuperAdmin } from "@/lib/rbac";
import { getTodayPosRevenue, getTodayFinanceIncome, getTodayFinanceExpense } from "@/lib/analyticsUtils";
import prisma from "@/lib/prisma";
import { User } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    // Use our enhanced API route client for better cookie handling
    const supabase = createAPIRouteClient(req);
    
    // Get the authenticated user with proper error handling
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("[API:analytics:revenue] Auth error:", error.message);
      return NextResponse.json({ error: "Authentication failed", detail: error.message }, { status: 401 });
    }
    
    if (!data?.user) {
      console.error("[API:analytics:revenue] No user found in session");
      return NextResponse.json({ error: "Unauthorized", detail: "No user found in session" }, { status: 401 });
    }
    
    const user: User = data.user;
    console.log(`[API:analytics:revenue] Authenticated user: ${user.id}`);
    
    // Check if SUPERADMIN for debugging purposes
    const userIsSuperAdmin = isSuperAdmin(user);
    console.log(`[API:analytics:revenue] User is SUPERADMIN: ${userIsSuperAdmin}`);
    
    // Get company ID from query params
    const { searchParams } = new URL(req.url);
    const requestedCompanyId = searchParams.get("companyId");

    if (!requestedCompanyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }
    
    // Get the effective company ID based on user role and requested company
    const effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
    
    if (!effectiveCompanyId) {
      // If no effective company ID, the user doesn't have access to any company
      console.log(`[API:analytics:revenue] User ${user.id} doesn't have access to company ${requestedCompanyId}`);
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    
    // If user is SUPERADMIN but requested a different company, log this for debugging
    if (userIsSuperAdmin && requestedCompanyId !== effectiveCompanyId) {
      console.log(`[API:analytics:revenue] SUPERADMIN requested company ${requestedCompanyId} but effective ID is ${effectiveCompanyId}`);
    }
    
    // Verify the company exists
    const company = await prisma.company.findUnique({
      where: { id: effectiveCompanyId },
      select: { id: true }
    });
    
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get today's revenue data using the effective company ID
    console.log(`[API:analytics:revenue] Fetching revenue data for company ${effectiveCompanyId}`);
    const [posRevenue, otherIncome, expenses] = await Promise.all([
      getTodayPosRevenue(effectiveCompanyId),
      getTodayFinanceIncome(effectiveCompanyId),
      getTodayFinanceExpense(effectiveCompanyId)
    ]);

    return NextResponse.json({
      posRevenue,
      otherIncome,
      expenses,
      companyId: effectiveCompanyId  // Include the company ID in the response for clarity
    });
  } catch (error) {
    console.error("Error in revenue API:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 