import { NextRequest, NextResponse } from "next/server";
import { auth, getPendingJoinRequests } from "@/lib/auth";

// GET: Get pending join requests for current admin/superadmin
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if authenticated
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get pending requests using our auth helper
    const pendingRequests = await getPendingJoinRequests(userId);
    
    return NextResponse.json({ 
      success: true,
      pendingRequests 
    });
  } catch (error) {
    console.error("Error fetching pending join requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending join requests" },
      { status: 500 }
    );
  }
} 