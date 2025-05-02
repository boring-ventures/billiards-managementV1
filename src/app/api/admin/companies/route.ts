/**
 * Admin API route for company management
 * Allows superadmins to manage companies across the platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { serverClient, logAdminOperation } from '@/lib/serverClient';
import { verifySuperAdmin } from '@/lib/middleware/adminApiAuth';

// GET /api/admin/companies - List all companies
export async function GET(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'COMPANIES_LIST');
  if (authResponse) return authResponse;
  
  try {
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const searchQuery = searchParams.get('search') || '';
    
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = serverClient
      .from('companies')
      .select('*, profiles:profiles(id, firstName, lastName, role, userId, active)', { count: 'exact' });
    
    // Apply search filter if provided
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }
    
    // Get paginated results
    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to);
    
    if (error) throw error;
    
    return NextResponse.json({
      companies: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error: any) {
    console.error('Error in admin companies GET:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/admin/companies - Create a new company
export async function POST(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'COMPANY_CREATE');
  if (authResponse) return authResponse;
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Create the company
    const { data: company, error } = await serverClient
      .from('companies')
      .insert({
        name: body.name,
        description: body.description || null,
        address: body.address || null,
        active: body.active !== undefined ? body.active : true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ company }, { status: 201 });
  } catch (error: any) {
    console.error('Error in admin companies POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create company' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/companies/:id - Update a company
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'COMPANY_UPDATE');
  if (authResponse) return authResponse;
  
  try {
    const companyId = req.nextUrl.pathname.split('/').pop();
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    
    // Update the company
    const { data: company, error } = await serverClient
      .from('companies')
      .update({
        name: body.name,
        description: body.description,
        address: body.address,
        active: body.active
      })
      .eq('id', companyId)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ company });
  } catch (error: any) {
    console.error('Error in admin companies PUT:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/companies/:id - Delete a company
export async function DELETE(req: NextRequest) {
  // Verify superadmin access - this is a high-risk operation
  const authResponse = await verifySuperAdmin(req, 'COMPANY_DELETE');
  if (authResponse) return authResponse;
  
  try {
    const companyId = req.nextUrl.pathname.split('/').pop();
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    // Get company users first to log details
    const { data: users } = await serverClient
      .from('profiles')
      .select('id, userId')
      .eq('companyId', companyId);
    
    // Check if company has any active users
    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete company with active users', userCount: users.length },
        { status: 409 }
      );
    }
    
    // Delete the company
    const { error } = await serverClient
      .from('companies')
      .delete()
      .eq('id', companyId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in admin companies DELETE:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete company' },
      { status: 500 }
    );
  }
} 