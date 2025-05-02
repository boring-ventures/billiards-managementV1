import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requestToJoinCompany } from "@/lib/auth";
import { z } from "zod";

// Schema for join request
const joinRequestSchema = z.object({
  companyId: z.string().uuid("Invalid company ID format"),
  message: z.string().optional(),
});

// POST: Create a join request
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Check if authenticated
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = joinRequestSchema.parse(body);
    
    // Create the join request using our auth helper
    const success = await requestToJoinCompany(
      userId, 
      validatedData.companyId, 
      validatedData.message
    );
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to create join request" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Join request submitted successfully"
    });
  } catch (error) {
    console.error("Error creating join request:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to process join request" },
      { status: 500 }
    );
  }
} 