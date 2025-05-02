/**
 * Admin API route for audit logs
 * Provides access to security-sensitive operation logs for monitoring and compliance
 */
import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/lib/serverClient';
import { verifySuperAdmin } from '@/lib/middleware/adminApiAuth';

interface CountResult {
  count: number;
}

// GET /api/admin/audit-logs - Get security audit logs
export async function GET(req: NextRequest) {
  // Verify superadmin access - this is security sensitive information
  const authResponse = await verifySuperAdmin(req, 'AUDIT_LOGS_ACCESS');
  if (authResponse) return authResponse;
  
  try {
    // Get query parameters for pagination
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const operation = searchParams.get('operation') || null;
    
    // Calculate pagination offset
    const offset = (page - 1) * limit;
    
    // Call the stored procedure to get audit logs
    const { data, error } = await serverClient.rpc(
      'get_admin_audit_logs',
      { limit_count: limit, offset_count: offset }
    );
    
    if (error) throw error;
    
    // Filter by operation if specified
    const filteredData = operation 
      ? data.filter((log: any) => log.operation === operation)
      : data;
    
    // Get total count for pagination
    const { count, error: countError } = await serverClient
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    return NextResponse.json({
      logs: filteredData,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error: any) {
    console.error('Error in admin audit logs GET:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/audit-logs - Manual log entry (for specific use cases)
export async function POST(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'AUDIT_LOG_CREATE');
  if (authResponse) return authResponse;
  
  try {
    // Get authenticated user ID from verify middleware
    const supabase = req.headers.get('x-supabase-auth') ? 
      JSON.parse(req.headers.get('x-supabase-auth') || '{}').userId :
      null;
      
    if (!supabase) {
      return NextResponse.json(
        { error: 'User ID not found in auth context' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.operation || typeof body.operation !== 'string') {
      return NextResponse.json(
        { error: 'Operation is required' },
        { status: 400 }
      );
    }
    
    // Create the audit log entry
    const { data, error } = await serverClient
      .from('admin_audit_logs')
      .insert({
        operation: body.operation,
        details: body.details || {},
        performed_by: supabase,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ log: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error in admin audit logs POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create audit log' },
      { status: 500 }
    );
  }
} 