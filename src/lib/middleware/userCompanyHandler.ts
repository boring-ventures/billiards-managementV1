/**
 * Utilities for handling users without companies in the middleware
 * Implements special cases for newly registered users and company assignments
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';

// Define user status types
export enum UserCompanyStatus {
  HAS_COMPANY = 'has_company',      // User has a valid company association
  NEW_USER = 'new_user',            // User is newly registered and has no company yet
  PENDING_APPROVAL = 'pending',     // User is waiting for company assignment
  REJECTED = 'rejected',            // User's company assignment was rejected 
  COMPANY_INACTIVE = 'inactive',    // User's company exists but is inactive
  NO_COMPANY = 'no_company'         // User has no company for any other reason
}

// Special redirect paths for different user statuses
const STATUS_REDIRECTS = {
  [UserCompanyStatus.NEW_USER]: '/select-company',
  [UserCompanyStatus.PENDING_APPROVAL]: '/waiting-approval',
  [UserCompanyStatus.REJECTED]: '/company-selection?status=rejected',
  [UserCompanyStatus.COMPANY_INACTIVE]: '/company-selection?status=inactive',
  [UserCompanyStatus.NO_COMPANY]: '/company-selection'
};

// Paths that don't require a company to access
const COMPANY_EXEMPT_PATHS = [
  '/select-company',
  '/waiting-approval',
  '/company-selection',
  '/api/companies/request',
  '/api/profile',
  '/api/auth'
];

/**
 * Check user company status and determine if redirection is needed
 * Handles special cases like new users and those waiting for approval
 */
export async function checkUserCompanyStatus(
  request: NextRequest,
  response: NextResponse,
  user: any
): Promise<{
  status: UserCompanyStatus;
  redirect?: string;
  companyId?: string | null;
}> {
  const { pathname } = request.nextUrl;
  
  // If path is exempt from company check, skip validation
  if (COMPANY_EXEMPT_PATHS.some(path => pathname.startsWith(path))) {
    return { status: UserCompanyStatus.HAS_COMPANY }; // Not actually has company, but no redirect needed
  }
  
  try {
    // Check if the user has company info in app_metadata (fastest route)
    const companyId = user.app_metadata?.company_id || null;
    const role = user.app_metadata?.role || null;
    
    // SuperAdmins are exempt from company requirements
    if (role === UserRole.SUPERADMIN) {
      return { status: UserCompanyStatus.HAS_COMPANY, companyId };
    }
    
    // If company ID exists in metadata, user has a company
    if (companyId) {
      // We need to verify the company is active
      const supabase = createMiddlewareClient(request, response);
      const { data: company, error } = await supabase
        .from('companies')
        .select('active')
        .eq('id', companyId)
        .single();
      
      if (error || !company) {
        console.warn(`Company ${companyId} not found for user ${user.id}`);
        return { 
          status: UserCompanyStatus.NO_COMPANY,
          redirect: STATUS_REDIRECTS[UserCompanyStatus.NO_COMPANY]
        };
      }
      
      if (!company.active) {
        return {
          status: UserCompanyStatus.COMPANY_INACTIVE,
          redirect: STATUS_REDIRECTS[UserCompanyStatus.COMPANY_INACTIVE],
          companyId
        };
      }
      
      // User has a valid, active company
      return { status: UserCompanyStatus.HAS_COMPANY, companyId };
    }
    
    // If no company in metadata, check profile table
    const supabase = createMiddlewareClient(request, response);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('companyId, registrationStatus, createdAt')
      .eq('userId', user.id)
      .single();
    
    if (profileError || !profile) {
      // This might be a new user who just registered but profile hasn't been created yet
      const creationTime = new Date(user.created_at).getTime();
      const now = Date.now();
      const isNewUser = (now - creationTime) < (24 * 60 * 60 * 1000); // less than 24 hours old
      
      if (isNewUser) {
        return {
          status: UserCompanyStatus.NEW_USER,
          redirect: STATUS_REDIRECTS[UserCompanyStatus.NEW_USER]
        };
      }
      
      return {
        status: UserCompanyStatus.NO_COMPANY,
        redirect: STATUS_REDIRECTS[UserCompanyStatus.NO_COMPANY]
      };
    }
    
    // Check registration status 
    if (!profile.companyId) {
      // Check if user has a pending company request
      if (profile.registrationStatus === 'PENDING') {
        return {
          status: UserCompanyStatus.PENDING_APPROVAL,
          redirect: STATUS_REDIRECTS[UserCompanyStatus.PENDING_APPROVAL]
        };
      }
      
      if (profile.registrationStatus === 'REJECTED') {
        return {
          status: UserCompanyStatus.REJECTED, 
          redirect: STATUS_REDIRECTS[UserCompanyStatus.REJECTED]
        };
      }
      
      // Check if user is newly registered
      const creationTime = new Date(profile.createdAt).getTime();
      const now = Date.now();
      const isNewUser = (now - creationTime) < (24 * 60 * 60 * 1000); // less than 24 hours old
      
      if (isNewUser) {
        return {
          status: UserCompanyStatus.NEW_USER,
          redirect: STATUS_REDIRECTS[UserCompanyStatus.NEW_USER]
        };
      }
      
      return {
        status: UserCompanyStatus.NO_COMPANY,
        redirect: STATUS_REDIRECTS[UserCompanyStatus.NO_COMPANY]
      };
    }
    
    // User has a company in the profile, verify it's active
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('active')
      .eq('id', profile.companyId)
      .single();
    
    if (companyError || !company) {
      return {
        status: UserCompanyStatus.NO_COMPANY,
        redirect: STATUS_REDIRECTS[UserCompanyStatus.NO_COMPANY]
      };
    }
    
    if (!company.active) {
      return {
        status: UserCompanyStatus.COMPANY_INACTIVE,
        redirect: STATUS_REDIRECTS[UserCompanyStatus.COMPANY_INACTIVE],
        companyId: profile.companyId
      };
    }
    
    // User has a valid, active company
    return { status: UserCompanyStatus.HAS_COMPANY, companyId: profile.companyId };
  } catch (error) {
    console.error('[Company Check] Error verifying company status:', error);
    
    // Default to NO_COMPANY on error with redirect for safety
    return { 
      status: UserCompanyStatus.NO_COMPANY,
      redirect: STATUS_REDIRECTS[UserCompanyStatus.NO_COMPANY]
    };
  }
} 