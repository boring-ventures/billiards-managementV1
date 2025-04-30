import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasApiPermission } from "@/lib/rbac";
import { getActivityLogs } from "@/lib/analyticsUtils";

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
    const limitStr = searchParams.get("limit");
    const entityType = searchParams.get("entityType") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const hoursStr = searchParams.get("hours");
    
    // Parse numeric values
    const limit = limitStr ? parseInt(limitStr) : 10;
    const hours = hoursStr ? parseInt(hoursStr) : 24;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Check if user has permission to access this company's data
    const hasPermission = hasApiPermission(session.user);
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get activity logs
    const logs = await getActivityLogs(companyId, { 
      limit, 
      entityType: entityType || undefined, 
      userId: userId || undefined, 
      hours 
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error in activity logs API:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
} 