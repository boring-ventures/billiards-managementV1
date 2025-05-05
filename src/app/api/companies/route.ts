import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { withAuth } from "@/lib/auth-server-utils";
import { getUserRole, hasPermission } from "@/lib/rbac-utils";

// Define the permission action type locally if not exported from rbac-utils
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

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

// GET: Fetch all companies for superadmin
export const GET = withAuth(async (req, { user, isSuperAdmin }) => {
  console.log(`[API] /companies GET - Authenticated user: ${user.id}, isSuperAdmin: ${isSuperAdmin}`);
  
  try {
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /companies GET - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /companies GET - User role: ${role}`);
    
    // Check permission for viewing companies
    const sectionKey = "admin.companies";
    const action: PermissionAction = "view";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /companies GET - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to view companies" },
        { status: 403 }
      );
    }

    // Fetch all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`[API] /companies GET - Successfully retrieved ${companies.length} companies`);
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[API] /companies GET - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
});

// POST: Create a new company
export const POST = withAuth(async (req, { user, isSuperAdmin }) => {
  console.log(`[API] /companies POST - Authenticated user: ${user.id}, isSuperAdmin: ${isSuperAdmin}`);
  
  try {
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /companies POST - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /companies POST - User role: ${role}`);
    
    // Check permission for creating companies
    const sectionKey = "admin.companies";
    const action: PermissionAction = "create";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /companies POST - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to create companies" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validationResult = companySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name: validationResult.data.name,
        address: validationResult.data.address,
        phone: validationResult.data.phone,
      },
    });

    // Optionally assign this company to the superadmin who created it
    const assignToCreator = body.assignToCreator === true;
    
    if (assignToCreator) {
      // Update the superadmin's profile with the new company ID
      await prisma.profile.update({
        where: { userId: user.id },
        data: { companyId: company.id },
      });
    }

    console.log(`[API] /companies POST - Successfully created company: ${company.id}`);
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("[API] /companies POST - Error:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
});

// PUT: Update a company
export const PUT = withAuth(async (req, { user, isSuperAdmin }) => {
  console.log(`[API] /companies PUT - Authenticated user: ${user.id}, isSuperAdmin: ${isSuperAdmin}`);
  
  try {
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /companies PUT - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /companies PUT - User role: ${role}`);
    
    // Check permission for editing companies
    const sectionKey = "admin.companies";
    const action: PermissionAction = "edit";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /companies PUT - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to edit companies" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }
    
    // Validate the update data
    const validationResult = companyUpdateSchema.safeParse(updateData);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Check if the company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }
    
    // Update the company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: validationResult.data,
    });
    
    console.log(`[API] /companies PUT - Successfully updated company: ${id}`);
    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error("[API] /companies PUT - Error:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
});

// DELETE: Delete a company
export const DELETE = withAuth(async (req, { user, isSuperAdmin }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    console.log(`[API] /companies DELETE - Authenticated user: ${user.id}, isSuperAdmin: ${isSuperAdmin}, companyId: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /companies DELETE - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /companies DELETE - User role: ${role}`);
    
    // Check permission for deleting companies
    const sectionKey = "admin.companies";
    const action: PermissionAction = "delete";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /companies DELETE - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to delete companies" },
        { status: 403 }
      );
    }
    
    // Check if the company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }
    
    // Check if the company has associated users
    const usersCount = await prisma.profile.count({
      where: { companyId: id },
    });
    
    if (usersCount > 0) {
      console.log(`[API] /companies DELETE - Cannot delete company with ${usersCount} associated users`);
      return NextResponse.json(
        { error: "Cannot delete company with associated users" },
        { status: 400 }
      );
    }
    
    // Delete the company
    await prisma.company.delete({
      where: { id },
    });
    
    console.log(`[API] /companies DELETE - Successfully deleted company: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] /companies DELETE - Error:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
});
