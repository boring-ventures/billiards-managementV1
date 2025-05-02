import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch available companies for joining
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    // Check if authenticated
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching available companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
} 