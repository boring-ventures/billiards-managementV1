import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserRole, hasPermission } from "@/lib/rbac-utils";
import { createSupabaseServerClient, getEffectiveCompanyId } from "@/lib/auth-server-utils";

// Define the permission action type locally if not exported from rbac-utils
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

// GET /api/tables/[tableId] - Get a single table
export async function GET(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  console.log(`[API] /tables/${params.tableId} - GET request received`);
  
  try {
    const { tableId } = params;
    
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /tables/${tableId} - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /tables/${tableId} - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /tables/${tableId} - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /tables/${tableId} - User role: ${role}`);
    
    // Check permission for viewing tables
    const sectionKey = "tables";
    const action: PermissionAction = "view";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /tables/${tableId} - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to view tables" },
        { status: 403 }
      );
    }

    // Determine effective company ID
    const searchParams = req.nextUrl.searchParams;
    const requestedCompanyId = searchParams.get("companyId");
    const effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
    
    console.log(`[API] /tables/${tableId} - Effective company ID: ${effectiveCompanyId}`);
    
    if (!effectiveCompanyId) {
      return NextResponse.json(
        { error: "No valid company context" },
        { status: 403 }
      );
    }

    // Get the table with company scope
    const table = await prisma.table.findUnique({
      where: { 
        id: tableId,
        companyId: effectiveCompanyId // Scope to effective company
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        sessions: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!table) {
      console.log(`[API] /tables/${tableId} - Table not found or not accessible to user`);
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    console.log(`[API] /tables/${tableId} - Successfully retrieved table`);
    return NextResponse.json({ table });
    
  } catch (error) {
    console.error(`[API] /tables/${params.tableId} - Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

// PUT /api/tables/[tableId] - Update a table
export async function PUT(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  console.log(`[API] /tables/${params.tableId} - PUT request received`);
  
  try {
    const { tableId } = params;
    
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /tables/${tableId} - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /tables/${tableId} - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /tables/${tableId} - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /tables/${tableId} - User role: ${role}`);
    
    // Check permission for editing tables
    const sectionKey = "tables";
    const action: PermissionAction = "edit";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /tables/${tableId} - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to edit tables" },
        { status: 403 }
      );
    }

    // Determine effective company ID
    const searchParams = req.nextUrl.searchParams;
    const requestedCompanyId = searchParams.get("companyId");
    const effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
    
    console.log(`[API] /tables/${tableId} - Effective company ID: ${effectiveCompanyId}`);
    
    if (!effectiveCompanyId) {
      return NextResponse.json(
        { error: "No valid company context" },
        { status: 403 }
      );
    }
    
    // Ensure table exists and belongs to the effective company
    const existingTable = await prisma.table.findUnique({
      where: { 
        id: tableId,
        companyId: effectiveCompanyId // Scope to effective company
      },
    });
    
    if (!existingTable) {
      console.log(`[API] /tables/${tableId} - Table not found or not accessible to user`);
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Parse the update data from request body
    const data = await req.json();
    
    // Update the table
    const updatedTable = await prisma.table.update({
      where: { 
        id: tableId 
      },
      data: {
        name: data.name,
        status: data.status,
        hourlyRate: data.hourlyRate
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[API] /tables/${tableId} - Successfully updated table`);
    return NextResponse.json({ table: updatedTable });
    
  } catch (error) {
    console.error(`[API] /tables/${params.tableId} - Error:`, error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

// DELETE /api/tables/[tableId] - Delete a table
export async function DELETE(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  console.log(`[API] /tables/${params.tableId} - DELETE request received`);
  
  try {
    const { tableId } = params;
    
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /tables/${tableId} - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /tables/${tableId} - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /tables/${tableId} - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /tables/${tableId} - User role: ${role}`);
    
    // Check permission for deleting tables
    const sectionKey = "tables";
    const action: PermissionAction = "delete";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /tables/${tableId} - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to delete tables" },
        { status: 403 }
      );
    }

    // Determine effective company ID
    const searchParams = req.nextUrl.searchParams;
    const requestedCompanyId = searchParams.get("companyId");
    const effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
    
    console.log(`[API] /tables/${tableId} - Effective company ID: ${effectiveCompanyId}`);
    
    if (!effectiveCompanyId) {
      return NextResponse.json(
        { error: "No valid company context" },
        { status: 403 }
      );
    }
    
    // Ensure table exists and belongs to the effective company
    const existingTable = await prisma.table.findUnique({
      where: { 
        id: tableId,
        companyId: effectiveCompanyId // Scope to effective company
      },
    });
    
    if (!existingTable) {
      console.log(`[API] /tables/${tableId} - Table not found or not accessible to user`);
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Check for active sessions
    const activeSessions = await prisma.tableSession.count({
      where: {
        tableId,
        endedAt: null,
      },
    });

    if (activeSessions > 0) {
      console.log(`[API] /tables/${tableId} - Cannot delete table with active sessions`);
      return NextResponse.json(
        { error: "Cannot delete a table with active sessions" },
        { status: 400 }
      );
    }

    // Delete the table
    await prisma.table.delete({
      where: { id: tableId },
    });

    console.log(`[API] /tables/${tableId} - Successfully deleted table`);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error(`[API] /tables/${params.tableId} - Error:`, error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
} 