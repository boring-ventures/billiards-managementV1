/**
 * Admin API route for user management
 * Allows superadmins to manage users across the platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { serverClient, logAdminOperation } from '@/lib/serverClient';
import { verifySuperAdmin } from '@/lib/middleware/adminApiAuth';
import { updateUserAuthMetadata } from '@/lib/auth-metadata';
import { createOrUpdateUserProfile } from '@/lib/auth';

// GET /api/admin/users - List all users
export async function GET(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'USERS_LIST');
  if (authResponse) return authResponse;
  
  try {
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const searchQuery = searchParams.get('search') || '';
    const role = searchParams.get('role') || null;
    const companyId = searchParams.get('companyId') || null;
    
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Build the base query with profile and company data
    let query = serverClient
      .from('profiles')
      .select(`
        *,
        companies:companies(id, name),
        user:auth.users!userId(id, email, created_at, confirmed_at, last_sign_in_at)
      `, { count: 'exact' });
    
    // Apply filters
    if (searchQuery) {
      query = query.or(`
        firstName.ilike.%${searchQuery}%,
        lastName.ilike.%${searchQuery}%,
        user.email.ilike.%${searchQuery}%
      `);
    }
    
    if (role) {
      query = query.eq('role', role);
    }
    
    if (companyId) {
      query = query.eq('companyId', companyId);
    }
    
    // Get paginated results
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return NextResponse.json({
      users: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error: any) {
    console.error('Error in admin users GET:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user
export async function POST(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'USER_CREATE');
  if (authResponse) return authResponse;
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const { data: existingUser } = await serverClient
      .from('auth.users')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create the user in auth system
    const { data: newUser, error: createError } = await serverClient.auth.admin.createUser({
      email: body.email,
      password: body.password || null,
      email_confirm: true,
      app_metadata: {
        role: body.role || UserRole.USER,
        companyId: body.companyId || null,
        initialized: true
      },
      user_metadata: {
        firstName: body.firstName || null,
        lastName: body.lastName || null
      }
    });
    
    if (createError) throw createError;
    
    // Create the user profile
    const profile = await createOrUpdateUserProfile(
      newUser.user.id,
      {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName
      },
      {
        forcedRole: body.role || UserRole.USER,
        companyId: body.companyId || null,
        active: body.active !== undefined ? body.active : true
      }
    );
    
    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (error: any) {
    console.error('Error in admin users POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/:userId - Update a user
export async function PUT(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'USER_UPDATE');
  if (authResponse) return authResponse;
  
  try {
    const userId = req.nextUrl.pathname.split('/').pop();
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    
    // Update the profile
    const { data: profile, error } = await serverClient
      .from('profiles')
      .update({
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        companyId: body.companyId,
        active: body.active
      })
      .eq('userId', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Also update app_metadata to keep it in sync
    await updateUserAuthMetadata(userId, {
      role: body.role,
      companyId: body.companyId
    });
    
    return NextResponse.json({ user: profile });
  } catch (error: any) {
    console.error('Error in admin users PUT:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/:userId - Delete a user
export async function DELETE(req: NextRequest) {
  // Verify superadmin access - this is a high-risk operation
  const authResponse = await verifySuperAdmin(req, 'USER_DELETE');
  if (authResponse) return authResponse;
  
  try {
    const userId = req.nextUrl.pathname.split('/').pop();
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the user from auth system
    const { error } = await serverClient.auth.admin.deleteUser(userId);
    
    if (error) throw error;
    
    // Note: This will cascade delete the profile through foreign key constraints
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in admin users DELETE:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
} 