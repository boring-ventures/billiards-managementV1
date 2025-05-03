/**
 * Company switching utilities for superadmins
 * Allows superadmins to operate on behalf of different companies
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';

// Cookie name for storing selected company
export const SELECTED_COMPANY_COOKIE = 'selected_company';

// Max age of company selection (24 hours)
const SELECTION_MAX_AGE = 24 * 60 * 60;

// Audit log type for company switching
const COMPANY_SWITCH_OPERATION = 'COMPANY_SWITCH';

/**
 * Check if a company selection cookie exists and is valid
 * Returns the selected company if valid, or null otherwise
 */
export async function getSelectedCompany(
  request: NextRequest,
  user: any
): Promise<{ 
  companyId: string | null;
  companyName: string | null;
  isValid: boolean;
  error?: string;
}> {
  try {
    // Only superadmins can switch companies
    const role = user.app_metadata?.role || null;
    if (role !== UserRole.SUPERADMIN) {
      return { companyId: null, companyName: null, isValid: false, error: 'Not a superadmin' };
    }
    
    // Check for the selected company cookie
    const selectedCompanyCookie = request.cookies.get(SELECTED_COMPANY_COOKIE);
    if (!selectedCompanyCookie?.value) {
      return { companyId: null, companyName: null, isValid: false };
    }
    
    // Parse the cookie value (format: companyId|timestamp)
    const [companyId, timestamp] = selectedCompanyCookie.value.split('|');
    
    // Validate timestamp
    const selectionTime = parseInt(timestamp, 10);
    const now = Date.now();
    const isExpired = now - selectionTime > SELECTION_MAX_AGE * 1000;
    
    if (isExpired) {
      return { companyId, companyName: null, isValid: false, error: 'Selection expired' };
    }
    
    // Validate company exists
    const supabase = createMiddlewareClient(request, new NextResponse());
    const { data: company, error } = await supabase
      .from('companies')
      .select('name, active')
      .eq('id', companyId)
      .single();
    
    if (error || !company) {
      return { companyId, companyName: null, isValid: false, error: 'Company not found' };
    }
    
    if (!company.active) {
      return { 
        companyId, 
        companyName: company.name, 
        isValid: false, 
        error: 'Company is inactive' 
      };
    }
    
    return { 
      companyId, 
      companyName: company.name, 
      isValid: true 
    };
  } catch (error: any) {
    console.error('[Company Switcher] Error getting selected company:', error);
    return { 
      companyId: null, 
      companyName: null, 
      isValid: false, 
      error: error?.message || 'Unexpected error' 
    };
  }
}

/**
 * Set the selected company for a superadmin
 * Returns updated response with cookie set
 */
export async function setSelectedCompany(
  request: NextRequest,
  response: NextResponse,
  userId: string,
  companyId: string
): Promise<NextResponse> {
  try {
    // Verify company exists
    const supabase = createMiddlewareClient(request, response);
    const { data: company, error } = await supabase
      .from('companies')
      .select('name, active')
      .eq('id', companyId)
      .single();
    
    if (error || !company) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    if (!company.active) {
      throw new Error(`Company ${companyId} is inactive`);
    }
    
    // Log the company switch for audit purposes
    await supabase
      .from('admin_audit_logs')
      .insert({
        operation: COMPANY_SWITCH_OPERATION,
        details: { companyId, companyName: company.name },
        performed_by: userId,
        timestamp: new Date().toISOString()
      });
    
    // Set the cookie with companyId and timestamp
    const cookieValue = `${companyId}|${Date.now()}`;
    response.cookies.set({
      name: SELECTED_COMPANY_COOKIE,
      value: cookieValue,
      maxAge: SELECTION_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    });
    
    return response;
  } catch (error: any) {
    console.error('[Company Switcher] Error setting selected company:', error);
    
    // Clear the cookie on error
    response.cookies.set({
      name: SELECTED_COMPANY_COOKIE,
      value: '',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  }
}

/**
 * Clear the selected company
 * Returns updated response with cookie cleared
 */
export function clearSelectedCompany(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SELECTED_COMPANY_COOKIE,
    value: '',
    maxAge: 0,
    path: '/',
  });
  
  return response;
} 