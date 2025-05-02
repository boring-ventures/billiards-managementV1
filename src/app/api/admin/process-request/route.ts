import { NextRequest, NextResponse } from "next/server";
import { auth, processJoinRequest } from "@/lib/auth";
import { z } from "zod";

// Schema for processing join requests
const processRequestSchema = z.object({
  requestId: z.string().uuid("Invalid request ID format"),
  decision: z.enum(["APPROVE", "REJECT"], {
    errorMap: () => ({ message: "Decision must be either APPROVE or REJECT" })
  }),
});

// POST: Process (approve/reject) a join request
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Check if authenticated
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = processRequestSchema.parse(body);
    
    // Process the join request using our auth helper
    const success = await processJoinRequest(
      validatedData.requestId, 
      validatedData.decision, 
      userId
    );
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to process join request" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Join request ${validatedData.decision.toLowerCase()}d successfully`
    });
  } catch (error) {
    console.error("Error processing join request:", error);
    
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