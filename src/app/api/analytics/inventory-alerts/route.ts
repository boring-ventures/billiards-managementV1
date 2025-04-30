import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasApiPermission } from "@/lib/rbac";
import { getInventoryAlerts } from "@/lib/analyticsUtils";

export async function GET(req: NextRequest) {
  try {
    // Get the session
    const session = await auth();
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get company ID from query params
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Check if user has permission to access this company's data
    const hasPermission = hasApiPermission(session.user);
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get inventory alerts
    const alerts = await getInventoryAlerts(companyId);

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error in inventory alerts API:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory alerts" },
      { status: 500 }
    );
  }
} 