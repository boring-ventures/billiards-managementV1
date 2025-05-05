/**
 * Admin API route for user management
 * Allows authorized admins to manage users across the platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/auth-server-utils';
import { getUserRole, hasPermission } from '@/lib/rbac-utils';

// Define the permission action type locally if not exported from rbac-utils
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

// GET /api/admin/users - List all users
export async function GET(req: NextRequest) {
  console.log(`[API] /admin/users GET - Request received`);
  
  try {
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /admin/users GET - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /admin/users GET - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /admin/users GET - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /admin/users GET - User role: ${role}`);
    
    // Check permission for viewing users
    const sectionKey = "admin.users";
    const action: PermissionAction = "view";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /admin/users GET - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to view users" },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const searchQuery = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || null;
    const requestedCompanyId = searchParams.get('companyId') || null;
    
    // Determine effective company ID
    const effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
    console.log(`[API] /admin/users GET - Effective company ID: ${effectiveCompanyId || 'none'}`);
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build filter conditions
    const where: any = {};
    
    // Apply role filter
    if (roleFilter) {
      where.role = roleFilter as UserRole;
    }
    
    // Apply company filter based on effective company ID
    // SUPERADMINs can view all users or filter by company
    // Regular users can only view users in their company
    if (role !== UserRole.SUPERADMIN) {
      // Non-superadmins must have a company context
      if (!effectiveCompanyId) {
        console.error(`[API] /admin/users GET - Non-superadmin user has no company context`);
        return NextResponse.json(
          { error: "No valid company context" },
          { status: 403 }
        );
      }
      
      // Force company filter for non-superadmins
      where.companyId = effectiveCompanyId;
    } else if (effectiveCompanyId) {
      // Superadmin viewing a specific company
      where.companyId = effectiveCompanyId;
    }
    
    // Apply search filter
    if (searchQuery) {
      where.OR = [
        { firstName: { contains: searchQuery, mode: 'insensitive' } },
        { lastName: { contains: searchQuery, mode: 'insensitive' } },
        { user: { email: { contains: searchQuery, mode: 'insensitive' } } }
      ];
    }
    
    // Get total count
    const total = await prisma.profile.count({
      where
    });
    
    // Get paginated results
    const profiles = await prisma.profile.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    
    // Get users from Supabase for each profile
    const userIds = profiles.map(profile => profile.userId);
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    // Filter users to match our profiles
    const filteredAuthUsers = authUsers?.users?.filter(authUser => 
      userIds.includes(authUser.id)
    );
    
    // Merge profile data with auth data
    const users = profiles.map(profile => {
      const authUser = filteredAuthUsers?.find(u => u.id === profile.userId);
      return {
        ...profile,
        user: authUser ? {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at
        } : null
      };
    });
    
    console.log(`[API] /admin/users GET - Successfully retrieved ${users.length} users`);
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: total ? Math.ceil(total / limit) : 0
      }
    });
  } catch (error: any) {
    console.error('[API] /admin/users GET - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user
export async function POST(req: NextRequest) {
  console.log(`[API] /admin/users POST - Request received`);
  
  try {
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /admin/users POST - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /admin/users POST - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /admin/users POST - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /admin/users POST - User role: ${role}`);
    
    // Check permission for creating users
    const sectionKey = "admin.users";
    const action: PermissionAction = "create";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /admin/users POST - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to create users" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Get requested company ID
    const requestedCompanyId = body.companyId || null;
    
    // Determine effective company ID
    const effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
    console.log(`[API] /admin/users POST - Effective company ID: ${effectiveCompanyId || 'none'}`);
    
    // Non-superadmins must have a company context
    if (role !== UserRole.SUPERADMIN && !effectiveCompanyId) {
      console.error(`[API] /admin/users POST - Non-superadmin user has no company context`);
      return NextResponse.json(
        { error: "No valid company context" },
        { status: 403 }
      );
    }
    
    // Check if user already exists - use appropriate method based on Supabase version
    let existingUser = null;
    try {
      // Try to get user by email - method may vary based on Supabase version
      const { data } = await supabase.from('auth.users')
        .select('id')
        .eq('email', body.email)
        .maybeSingle();
      
      existingUser = data;
    } catch (error: any) {
      console.log(`[API] /admin/users POST - Error checking existing user: ${error.message}`);
      // Fall through, existingUser remains null
    }
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Check role privileges - users can't create users with higher privileges
    const targetRole = body.role || UserRole.USER;
    
    if (!canManageRole(role, targetRole)) {
      console.error(`[API] /admin/users POST - User ${user.id} with role ${role} cannot create users with role ${targetRole}`);
      return NextResponse.json(
        { error: `You don't have permission to create users with role: ${targetRole}` },
        { status: 403 }
      );
    }
    
    // Create the user in auth system
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password || null,
      email_confirm: true,
      app_metadata: {
        role: targetRole,
        companyId: effectiveCompanyId,
        initialized: true
      },
      user_metadata: {
        firstName: body.firstName || null,
        lastName: body.lastName || null
      }
    });
    
    if (createError || !newUser) {
      throw createError || new Error('Failed to create user in auth system');
    }
    
    // Create the user profile
    const newProfile = await prisma.profile.create({
      data: {
        userId: newUser.user.id,
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        role: targetRole,
        companyId: effectiveCompanyId,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    console.log(`[API] /admin/users POST - Successfully created user: ${newUser.user.id}`);
    return NextResponse.json({ user: newProfile }, { status: 201 });
  } catch (error: any) {
    console.error('[API] /admin/users POST - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/:userId - Update a user
export async function PUT(req: NextRequest) {
  const targetUserId = req.nextUrl.pathname.split('/').pop();
  console.log(`[API] /admin/users PUT - Request received for user: ${targetUserId}`);
  
  if (!targetUserId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /admin/users PUT - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /admin/users PUT - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /admin/users PUT - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /admin/users PUT - User role: ${role}`);
    
    // Check permission for editing users
    const sectionKey = "admin.users";
    const action: PermissionAction = "edit";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /admin/users PUT - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to edit users" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    
    // Get target profile to check permissions
    const targetProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
    });
    
    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Regular admins can only edit users in their company
    if (role !== UserRole.SUPERADMIN) {
      const adminProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { companyId: true }
      });
      
      if (!adminProfile?.companyId || adminProfile.companyId !== targetProfile.companyId) {
        console.error(`[API] /admin/users PUT - User ${user.id} cannot edit user from different company`);
        return NextResponse.json(
          { error: 'You can only edit users from your own company' },
          { status: 403 }
        );
      }
    }
    
    // Check role privileges - users can't grant higher privileges than they have
    const targetRole = body.role || targetProfile.role;
    
    if (!canManageRole(role, targetRole)) {
      console.error(`[API] /admin/users PUT - User ${user.id} with role ${role} cannot set role ${targetRole}`);
      return NextResponse.json(
        { error: `You don't have permission to assign role: ${targetRole}` },
        { status: 403 }
      );
    }
    
    // Determine effective company ID if company is being changed
    let effectiveCompanyId = targetProfile.companyId;
    if (body.companyId !== undefined && body.companyId !== targetProfile.companyId) {
      effectiveCompanyId = await getEffectiveCompanyId(user.id, body.companyId);
      console.log(`[API] /admin/users PUT - Effective company ID: ${effectiveCompanyId || 'none'}`);
      
      if (!effectiveCompanyId && body.companyId) {
        return NextResponse.json(
          { error: "Invalid company ID or no access to specified company" },
          { status: 403 }
        );
      }
    }
    
    // Update the profile
    const updatedProfile = await prisma.profile.update({
      where: { userId: targetUserId },
      data: {
        firstName: body.firstName !== undefined ? body.firstName : targetProfile.firstName,
        lastName: body.lastName !== undefined ? body.lastName : targetProfile.lastName,
        role: targetRole,
        companyId: effectiveCompanyId,
        active: body.active !== undefined ? body.active : targetProfile.active
      }
    });
    
    // Also update app_metadata to keep it in sync
    await supabase.auth.admin.updateUserById(targetUserId, {
      app_metadata: {
        role: targetRole,
        companyId: effectiveCompanyId
      }
    });
    
    console.log(`[API] /admin/users PUT - Successfully updated user: ${targetUserId}`);
    return NextResponse.json({ user: updatedProfile });
  } catch (error: any) {
    console.error('[API] /admin/users PUT - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/:userId - Delete a user
export async function DELETE(req: NextRequest) {
  const targetUserId = req.nextUrl.pathname.split('/').pop();
  console.log(`[API] /admin/users DELETE - Request received for user: ${targetUserId}`);
  
  if (!targetUserId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Initialize supabase client with standardized utility
    const supabase = createSupabaseServerClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[API] /admin/users DELETE - Authentication failed:`, authError?.message || "No user found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    console.log(`[API] /admin/users DELETE - Authenticated user: ${user.id}`);
    
    // Get user role and permissions
    const { role, permissions } = await getUserRole(user.id);
    
    if (!role || !permissions) {
      console.error(`[API] /admin/users DELETE - No role or permissions found for user: ${user.id}`);
      return NextResponse.json(
        { error: "User role not found" },
        { status: 403 }
      );
    }
    
    console.log(`[API] /admin/users DELETE - User role: ${role}`);
    
    // Check permission for deleting users
    const sectionKey = "admin.users";
    const action: PermissionAction = "delete";
    
    if (!hasPermission(permissions, role, sectionKey, action)) {
      console.error(`[API] /admin/users DELETE - Permission denied for user: ${user.id}, section: ${sectionKey}, action: ${action}`);
      return NextResponse.json(
        { error: "You do not have permission to delete users" },
        { status: 403 }
      );
    }
    
    // Get target profile to check permissions
    const targetProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId }
    });
    
    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Regular admins can only delete users in their company
    if (role !== UserRole.SUPERADMIN) {
      const adminProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { companyId: true }
      });
      
      if (!adminProfile?.companyId || adminProfile.companyId !== targetProfile.companyId) {
        console.error(`[API] /admin/users DELETE - User ${user.id} cannot delete user from different company`);
        return NextResponse.json(
          { error: 'You can only delete users from your own company' },
          { status: 403 }
        );
      }
    }
    
    // Check role privileges - users can't delete users with higher privileges
    if (!canManageRole(role, targetProfile.role)) {
      console.error(`[API] /admin/users DELETE - User ${user.id} with role ${role} cannot delete user with role ${targetProfile.role}`);
      return NextResponse.json(
        { error: `You don't have permission to delete users with role: ${targetProfile.role}` },
        { status: 403 }
      );
    }
    
    // Prevent self-deletion
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }
    
    // Delete the user from auth system
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // Delete the profile (can be done before auth deletion since prisma will rollback on error)
    await prisma.profile.delete({
      where: { userId: targetUserId }
    });
    
    console.log(`[API] /admin/users DELETE - Successfully deleted user: ${targetUserId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] /admin/users DELETE - Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if a user with a certain role can manage users with another role
 * Implements role hierarchy: SUPERADMIN > ADMIN > SELLER > USER
 * @param managerRole The role of the user performing the action
 * @param targetRole The role being assigned or managed
 * @returns boolean indicating if the manager can manage the target role
 */
function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.SUPERADMIN]: 4,
    [UserRole.ADMIN]: 3,
    [UserRole.SELLER]: 2,
    [UserRole.USER]: 1
  };
  
  // Can only manage roles of equal or lower privilege
  return (roleHierarchy[managerRole] || 0) >= (roleHierarchy[targetRole] || 0);
}

/**
 * Helper function to get the effective company ID
 * Used for determining which company context to use for data operations
 * @param userId The user ID
 * @param requestedCompanyId Optional requested company ID
 * @returns The effective company ID or null
 */
async function getEffectiveCompanyId(userId: string, requestedCompanyId?: string | null): Promise<string | null> {
  try {
    // Get the user's profile with role
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { companyId: true, role: true }
    });
    
    if (!profile) return null;
    
    // For SUPERADMIN, allow access to any company if requested
    if (profile.role === UserRole.SUPERADMIN) {
      if (requestedCompanyId) {
        // Verify the requested company exists
        const companyExists = await prisma.company.findUnique({
          where: { id: requestedCompanyId }
        });
        
        if (companyExists) {
          return requestedCompanyId;
        }
      }
      
      // Return the superadmin's assigned company or null
      return profile.companyId;
    }
    
    // For all other users, return their assigned company
    return profile.companyId;
  } catch (error) {
    console.error('[API] Error determining effective company ID:', error);
    return null;
  }
} 