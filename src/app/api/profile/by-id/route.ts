import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET: Fetch a user's profile by userId
 * Endpoint: /api/profile/by-id?userId={userId}
 * Used for superadmin user switching
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    if (!userIdParam) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    
    // Fetch the profile based on userId
    const profile = await prisma.profile.findUnique({
      where: { userId: userIdParam },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[API] /profile/by-id GET - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
} 