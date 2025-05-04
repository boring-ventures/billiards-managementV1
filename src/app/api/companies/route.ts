import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Company schema for validation
const companySchema = z.object({
  name: z.string().min(1, { message: "Company name is required" }),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Company update schema
const companyUpdateSchema = z.object({
  name: z.string().min(1, { message: "Company name is required" }).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  active: z.boolean().optional(),
});

// Helper function for creating Supabase client with proper cookie handling
function createSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // In Next.js 14, cookies() is synchronous
          return cookies().get(name)?.value;
        },
        set() {
          // Not needed in API routes
        },
        remove() {
          // Not needed in API routes
        },
      },
    }
  );
}

// Function to check if user has super admin role
async function checkSuperAdminRole(userId: string) {
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { role: true },
    });
    
    // More robust check for superadmin role
    const isSuperAdmin = profile && (
      profile.role === "SUPERADMIN" || 
      String(profile.role).toUpperCase() === "SUPERADMIN"
    );
    
    console.log("API:companies - Checking superadmin status", {
      userId,
      role: profile?.role,
      isSuperAdmin
    });
    
    return isSuperAdmin;
  } catch (error) {
    console.error("Failed to check user role:", error);
    return false;
  }
}

// GET: Fetch all companies for superadmin
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();

    // Get the current user's session using the more reliable getUser method
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("API:companies:GET - Auth error:", userError.message);
      
      // Don't log a removal message as it can be confusing - just return the error
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Not authenticated", detail: userError.message }),
        { 
          status: 401,
          headers: headers
        }
      );
    }

    if (!user) {
      console.error("API:companies:GET - No user found in session");
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Not authenticated", detail: "No user found in session" }),
        { 
          status: 401,
          headers: headers
        }
      );
    }

    const userId = user.id;

    // Fetch user profile to check role
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    console.log("API:companies:GET - User profile:", {
      userId,
      role: profile?.role
    });

    // Check if user is a superadmin
    const isSuperAdmin = profile && (
      profile.role === UserRole.SUPERADMIN || 
      String(profile.role).toUpperCase() === "SUPERADMIN"
    );

    console.log("API:companies:GET - Is superadmin:", isSuperAdmin);

    // Only superadmin can see all companies
    if (!profile || !isSuperAdmin) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized: Only superadmins can access all companies" }),
        { 
          status: 403,
          headers: headers
        }
      );
    }

    // Fetch all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Set proper content type
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ companies }),
      { 
        status: 200,
        headers: headers
      }
    );
  } catch (error) {
    console.error("Error fetching companies:", error);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch companies" }),
      { 
        status: 500,
        headers: headers
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized", detail: userError?.message || "No user found" }),
        { 
          status: 401,
          headers: headers
        }
      );
    }

    // Check if user has super admin role
    const isSuperAdmin = await checkSuperAdminRole(user.id);
    if (!isSuperAdmin) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Requires super admin access" }),
        { 
          status: 403,
          headers: headers
        }
      );
    }

    const body = await req.json();
    const validatedData = companySchema.parse(body);

    const company = await db.company.create({
      data: {
        name: validatedData.name,
        address: validatedData.address,
        phone: validatedData.phone,
      },
    });

    // Optionally assign this company to the superadmin who created it
    const assignToCreator = body.assignToCreator === true;
    
    if (assignToCreator) {
      // Update the superadmin's profile with the new company ID
      await db.profile.update({
        where: { userId: user.id },
        data: { companyId: company.id },
      });
      
      // Set proper content type
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      // Indicate that the company was assigned
      return new NextResponse(
        JSON.stringify({ 
          ...company, 
          assigned: true,
          message: "Company created and assigned to your profile" 
        }),
        { 
          status: 201,
          headers: headers
        }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify(company),
      { 
        status: 201,
        headers: headers
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      
      return new NextResponse(
        JSON.stringify({ error: error.errors }),
        { 
          status: 400,
          headers: headers
        }
      );
    }

    console.error("[COMPANIES_POST]", error);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    return new NextResponse(
      JSON.stringify({ error: "Internal error" }),
      { 
        status: 500,
        headers: headers
      }
    );
  }
}
