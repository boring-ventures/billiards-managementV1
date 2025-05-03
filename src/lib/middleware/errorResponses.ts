/**
 * Error response utilities for authentication middleware
 * Provides consistent, user-friendly error responses with appropriate status codes
 */
import { NextRequest, NextResponse } from 'next/server';
import { AuthEventType, logAuthEvent } from './authLogger';

// Error response types
export enum AuthErrorType {
  NOT_AUTHENTICATED = 'not_authenticated',
  SESSION_EXPIRED = 'session_expired',
  INVALID_TOKEN = 'invalid_token',
  COMPANY_REQUIRED = 'company_required',
  COMPANY_INACTIVE = 'company_inactive',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMITED = 'rate_limited',
  MAINTENANCE_MODE = 'maintenance_mode',
  UNKNOWN_ERROR = 'unknown_error'
}

// Map error types to HTTP status codes
const errorStatusCodes: Record<AuthErrorType, number> = {
  [AuthErrorType.NOT_AUTHENTICATED]: 401,
  [AuthErrorType.SESSION_EXPIRED]: 401,
  [AuthErrorType.INVALID_TOKEN]: 401,
  [AuthErrorType.COMPANY_REQUIRED]: 403,
  [AuthErrorType.COMPANY_INACTIVE]: 403,
  [AuthErrorType.PERMISSION_DENIED]: 403,
  [AuthErrorType.RATE_LIMITED]: 429,
  [AuthErrorType.MAINTENANCE_MODE]: 503,
  [AuthErrorType.UNKNOWN_ERROR]: 500
};

// Map error types to user-friendly messages
const errorMessages: Record<AuthErrorType, string> = {
  [AuthErrorType.NOT_AUTHENTICATED]: 'Authentication required to access this resource',
  [AuthErrorType.SESSION_EXPIRED]: 'Your session has expired, please sign in again',
  [AuthErrorType.INVALID_TOKEN]: 'Invalid authentication credentials',
  [AuthErrorType.COMPANY_REQUIRED]: 'You must be associated with a company to access this resource',
  [AuthErrorType.COMPANY_INACTIVE]: 'Your company account is currently inactive',
  [AuthErrorType.PERMISSION_DENIED]: 'You don\'t have permission to access this resource',
  [AuthErrorType.RATE_LIMITED]: 'Too many requests, please try again later',
  [AuthErrorType.MAINTENANCE_MODE]: 'The system is currently undergoing maintenance',
  [AuthErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred'
};

// Redirect targets for different error types
const errorRedirectPaths: Partial<Record<AuthErrorType, string>> = {
  [AuthErrorType.NOT_AUTHENTICATED]: '/sign-in',
  [AuthErrorType.SESSION_EXPIRED]: '/sign-in?error=session_expired',
  [AuthErrorType.INVALID_TOKEN]: '/sign-in?error=invalid_token',
  [AuthErrorType.COMPANY_REQUIRED]: '/select-company',
  [AuthErrorType.COMPANY_INACTIVE]: '/company-selection?status=inactive',
  [AuthErrorType.MAINTENANCE_MODE]: '/maintenance'
};

/**
 * Generate an appropriate API error response
 */
export async function createApiErrorResponse(
  request: NextRequest,
  errorType: AuthErrorType,
  details?: any,
  userId?: string | null
): Promise<NextResponse> {
  const statusCode = errorStatusCodes[errorType];
  const message = errorMessages[errorType];
  
  // Log the error event
  await logAuthEvent(
    mapErrorTypeToEventType(errorType),
    request,
    {
      userId,
      message,
      error: details,
      statusCode,
      path: request.nextUrl.pathname,
      metadata: { errorType }
    },
    'warn'
  );
  
  // Create detailed error response for API
  return NextResponse.json(
    {
      error: {
        type: errorType,
        message,
        details: details ? (details.message || details) : undefined,
        path: request.nextUrl.pathname,
        requestId: request.headers.get('x-request-id') || undefined
      }
    },
    { status: statusCode }
  );
}

/**
 * Generate an appropriate UI redirect for authentication errors
 */
export async function createErrorRedirect(
  request: NextRequest,
  errorType: AuthErrorType,
  details?: any,
  userId?: string | null,
  customRedirectUrl?: string
): Promise<NextResponse> {
  // Get the redirect path for this error type
  const redirectPath = customRedirectUrl || errorRedirectPaths[errorType] || '/sign-in';
  
  // Create the URL with the original URL as a callback parameter
  const redirectUrl = new URL(redirectPath, request.url);
  
  // Only add the callback for authentication errors, not permission errors
  if ([AuthErrorType.NOT_AUTHENTICATED, AuthErrorType.SESSION_EXPIRED, AuthErrorType.INVALID_TOKEN].includes(errorType)) {
    redirectUrl.searchParams.set('callbackUrl', encodeURIComponent(request.url));
  }
  
  // Add error information where appropriate
  if (!customRedirectUrl && errorType !== AuthErrorType.NOT_AUTHENTICATED) {
    redirectUrl.searchParams.set('error', errorType);
    
    // Add error message if we have one and it's not sensitive
    if (details && typeof details === 'string' && !containsSensitiveInfo(details)) {
      redirectUrl.searchParams.set('errorDetail', encodeURIComponent(details));
    }
  }
  
  // Log the error event
  await logAuthEvent(
    mapErrorTypeToEventType(errorType),
    request,
    {
      userId,
      message: errorMessages[errorType],
      error: details,
      statusCode: 302, // Redirect status code
      path: request.nextUrl.pathname,
      metadata: { 
        errorType,
        redirectUrl: redirectUrl.toString()
      }
    },
    'warn'
  );
  
  return NextResponse.redirect(redirectUrl);
}

/**
 * Handle graceful degradation for auth failures
 * Provides a fallback UI for critical auth components
 */
export function createGracefulDegradation(response: NextResponse): NextResponse {
  // Set headers to indicate degraded auth
  response.headers.set('X-Auth-Degraded', 'true');
  
  // Return the modified response
  return response;
}

/**
 * Check if a string contains potentially sensitive information
 */
function containsSensitiveInfo(text: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /credential/i,
    /jwt/i,
    /authorization/i,
    /auth/i,
    /login/i,
    /signin/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(text));
}

/**
 * Map error type to auth event type for logging
 */
function mapErrorTypeToEventType(errorType: AuthErrorType): AuthEventType {
  switch (errorType) {
    case AuthErrorType.NOT_AUTHENTICATED:
      return AuthEventType.AUTH_FAILURE;
    case AuthErrorType.SESSION_EXPIRED:
      return AuthEventType.SESSION_EXPIRED;
    case AuthErrorType.INVALID_TOKEN:
      return AuthEventType.INVALID_TOKEN;
    case AuthErrorType.COMPANY_REQUIRED:
    case AuthErrorType.COMPANY_INACTIVE:
      return AuthEventType.COMPANY_VALIDATION;
    case AuthErrorType.PERMISSION_DENIED:
      return AuthEventType.PERMISSION_DENIED;
    case AuthErrorType.RATE_LIMITED:
      return AuthEventType.RATE_LIMIT_EXCEEDED;
    default:
      return AuthEventType.AUTH_FAILURE;
  }
} 