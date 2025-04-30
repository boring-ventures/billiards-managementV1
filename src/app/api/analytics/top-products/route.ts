import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasApiPermission } from "@/lib/rbac";
import { getTopProducts } from "@/lib/analyticsUtils";

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
    const limit = limitStr ? parseInt(limitStr) : 5;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Check if user has permission to access this company's data
    const hasPermission = hasApiPermission(session.user);
    if (!hasPermission) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get top products
    const topProducts = await getTopProducts(companyId, limit);

    return NextResponse.json(topProducts);
  } catch (error) {
    console.error("Error in top products API:", error);
    return NextResponse.json(
      { error: "Failed to fetch top products" },
      { status: 500 }
    );
  }
} 