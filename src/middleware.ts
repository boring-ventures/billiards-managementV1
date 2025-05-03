import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient, AUTH_TOKEN_KEY } from '@/lib/auth-utils'
import { refreshSessionWithBackoff } from '@/lib/middleware/sessionRefresh'
import { checkUserCompanyStatus, UserCompanyStatus } from '@/lib/middleware/userCompanyHandler'
import { getSelectedCompany, SELECTED_COMPANY_COOKIE } from '@/lib/middleware/companySwitcher'
import { logAuthEvent, AuthEventType } from '@/lib/middleware/authLogger'
import { 
  createApiErrorResponse, 
  createErrorRedirect, 
  createGracefulDegradation,
  AuthErrorType 
} from '@/lib/middleware/errorResponses'

// List of paths that should not check for authentication
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/sign-out',
  '/magic-link',
  '/auth/confirm',
  '/auth/callback',
  '/forgot-password',
  '/api/auth',
  '/terms',
  '/privacy',
]

// Helper to check if a path starts with any of the public paths
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))
}

// Helper to check if path is a static asset
function isStaticAsset(path: string): boolean {
  return (
    path.startsWith('/_next/') || 
    path.startsWith('/favicon.ico') || 
    path.includes('sw.js') ||
    /\.(svg|png|jpg|jpeg|gif|webp|css|js|json|woff|woff2|ttf|eot)$/.test(path)
  )
}

/**
 * Middleware runs on every request to verify authentication
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { pathname } = request.nextUrl
    
    // Skip middleware for public paths and static files
    if (isPublicPath(pathname) || isStaticAsset(pathname)) {
      return NextResponse.next()
    }
    
    // Initialize response
    const response = NextResponse.next()
    
    // Check for auth cookie presence to save a round trip if possible
    const hasAuthCookie = request.cookies.has(AUTH_TOKEN_KEY)
    
    if (!hasAuthCookie && !request.headers.has('authorization')) {
      // Log missing token event
      await logAuthEvent(AuthEventType.MISSING_TOKEN, request, {
        message: 'No authentication token present',
        path: pathname,
        statusCode: 401,
      }, 'warn')
      
      // If requesting API, return 401
      if (pathname.startsWith('/api/')) {
        return await createApiErrorResponse(
          request,
          AuthErrorType.NOT_AUTHENTICATED,
          'No authentication credentials found'
        )
      }
      
      // Redirect to login for non-API routes
      return await createErrorRedirect(
        request,
        AuthErrorType.NOT_AUTHENTICATED
      )
    }
    
    // Use enhanced session refresh with backoff
    const { success, user, error: refreshError, refreshed } = 
      await refreshSessionWithBackoff(request, response)
    
    if (!success || !user) {
      // If the session refresh failed, handle the error
      const errorType = refreshError?.includes('expired') 
        ? AuthErrorType.SESSION_EXPIRED 
        : AuthErrorType.INVALID_TOKEN
      
      // If requesting API, return 401
      if (pathname.startsWith('/api/')) {
        return await createApiErrorResponse(
          request,
          errorType,
          refreshError
        )
      }
      
      // Redirect to login for non-API routes
      return await createErrorRedirect(
        request,
        errorType,
        refreshError
      )
    }
    
    // Log successful token refresh if one occurred
    if (refreshed) {
      await logAuthEvent(AuthEventType.SESSION_REFRESH, request, {
        userId: user.id,
        message: 'Session refreshed successfully',
        metrics: {
          authDuration: Date.now() - startTime,
          totalMiddlewareDuration: Date.now() - startTime
        }
      }, 'info')
    }
    
    // Verify the user has a valid company association if needed
    const companyStatus = await checkUserCompanyStatus(request, response, user)
    
    // If the user needs to be redirected to a company-related page
    if (companyStatus.redirect && companyStatus.status !== UserCompanyStatus.HAS_COMPANY) {
      await logAuthEvent(AuthEventType.COMPANY_VALIDATION, request, {
        userId: user.id,
        companyId: companyStatus.companyId,
        message: `Company validation: ${companyStatus.status}`,
        metadata: { companyStatus: companyStatus.status }
      }, 'info')
      
      // If API request, return appropriate error
      if (pathname.startsWith('/api/')) {
        const errorType = companyStatus.status === UserCompanyStatus.COMPANY_INACTIVE
          ? AuthErrorType.COMPANY_INACTIVE
          : AuthErrorType.COMPANY_REQUIRED
          
        return await createApiErrorResponse(
          request,
          errorType,
          `Company validation failed: ${companyStatus.status}`,
          user.id
        )
      }
      
      // For UI routes, redirect to appropriate page
      return NextResponse.redirect(new URL(companyStatus.redirect, request.url))
    }
    
    // For superadmins, check if they have selected a company to operate as
    const userRole = user.app_metadata?.role || null
    if (userRole === 'SUPERADMIN') {
      const selectedCompany = await getSelectedCompany(request, user)
      
      // If the selection is valid, add context header
      if (selectedCompany.isValid && selectedCompany.companyId) {
        response.headers.set('X-Selected-Company', selectedCompany.companyId)
        response.headers.set('X-Selected-Company-Name', selectedCompany.companyName || '')
      } else if (selectedCompany.companyId && !selectedCompany.isValid) {
        // Invalid selection - clear it
        response.cookies.set({
          name: SELECTED_COMPANY_COOKIE,
          value: '',
          maxAge: 0,
          path: '/',
        })
      }
    }
    
    // Log successful authentication
    const endTime = Date.now()
    await logAuthEvent(AuthEventType.AUTH_SUCCESS, request, {
      userId: user.id,
      companyId: companyStatus.companyId,
      metrics: {
        totalMiddlewareDuration: endTime - startTime,
        authDuration: endTime - startTime
      }
    }, 'debug')
    
    // User is authenticated, allow access and pass updated cookies
    return response
  } catch (error: any) {
    console.error('[Middleware] Unexpected error:', error)
    
    // Log the error
    await logAuthEvent(AuthEventType.AUTH_FAILURE, request, {
      error,
      message: 'Unexpected middleware error',
      statusCode: 500,
      metrics: {
        totalMiddlewareDuration: Date.now() - startTime,
        authDuration: Date.now() - startTime
      }
    }, 'error')
    
    // Attempt graceful degradation
    const response = createGracefulDegradation(NextResponse.next())
    
    // Set header indicating error
    response.headers.set('X-Auth-Error', 'true')
    
    return response
  }
}

// Use a more optimized matcher pattern
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files (e.g. robots.txt)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|robots.txt|sitemap.xml).*)',
  ],
}
