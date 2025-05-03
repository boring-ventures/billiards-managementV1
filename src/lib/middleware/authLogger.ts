/**
 * Authentication logger and monitoring for middleware
 * Implements structured logging and metrics collection for auth-related events
 */
import { NextRequest } from 'next/server';
import { serverClient } from '@/lib/serverClient';

// Event types for authentication logs
export enum AuthEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  SESSION_REFRESH = 'session_refresh',
  SESSION_EXPIRED = 'session_expired',
  TOKEN_REFRESH_FAILURE = 'token_refresh_failure',
  INVALID_TOKEN = 'invalid_token',
  MISSING_TOKEN = 'missing_token',
  COMPANY_VALIDATION = 'company_validation',
  COMPANY_SWITCH = 'company_switch',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  PERMISSION_DENIED = 'permission_denied'
}

// Log level types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Performance metrics
type PerformanceMetrics = {
  authDuration: number;
  tokenRefreshDuration?: number;
  companyValidationDuration?: number;
  totalMiddlewareDuration: number;
};

/**
 * Log an authentication event with structured data
 */
export async function logAuthEvent(
  eventType: AuthEventType,
  request: NextRequest,
  data: {
    userId?: string | null;
    error?: any;
    message?: string;
    companyId?: string | null;
    path?: string;
    statusCode?: number;
    metrics?: PerformanceMetrics;
    metadata?: Record<string, any>;
  },
  level: LogLevel = 'info'
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const requestId = request.headers.get('x-request-id') || Math.random().toString(36).substring(2, 15);
    const path = data.path || request.nextUrl.pathname;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || null;
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Create structured log entry
    const logEntry = {
      timestamp,
      requestId,
      eventType,
      level,
      path,
      method: request.method,
      userId: data.userId,
      companyId: data.companyId,
      userAgent,
      referer,
      ip,
      message: data.message || getDefaultMessageForEvent(eventType),
      statusCode: data.statusCode,
      error: data.error ? formatError(data.error) : undefined,
      metrics: data.metrics,
      metadata: data.metadata
    };
    
    // Log to console with the appropriate level
    const consoleLogMethod = getConsoleMethod(level);
    consoleLogMethod(`[Auth] ${logEntry.message}`, { 
      requestId, 
      userId: data.userId, 
      path,
      ...data.metrics
    });
    
    // Only store errors and warnings in the database
    if (level === 'error' || level === 'warn') {
      // Store in database for persistent logging
      await serverClient
        .from('auth_event_logs')
        .insert({
          event_type: eventType,
          user_id: data.userId,
          company_id: data.companyId,
          path,
          method: request.method,
          status_code: data.statusCode,
          message: data.message || getDefaultMessageForEvent(eventType),
          error_details: data.error ? formatError(data.error) : null,
          request_id: requestId,
          ip_address: ip,
          user_agent: userAgent,
          referer,
          performance_metrics: data.metrics,
          additional_data: data.metadata,
          timestamp
        });
    }
    
    // For performance monitoring, we could send metrics to a monitoring service
    if (data.metrics && process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      // Here you would integrate with your monitoring service (Datadog, New Relic, etc.)
      // This is a placeholder for where you would send performance metrics
      console.debug('[Performance]', {
        path,
        ...data.metrics
      });
    }
  } catch (error) {
    // Fail silently to prevent middleware from crashing
    console.error('Error logging auth event:', error);
  }
}

/**
 * Get default message for an event type
 */
function getDefaultMessageForEvent(eventType: AuthEventType): string {
  switch (eventType) {
    case AuthEventType.AUTH_SUCCESS:
      return 'Authentication successful';
    case AuthEventType.AUTH_FAILURE:
      return 'Authentication failed';
    case AuthEventType.SESSION_REFRESH:
      return 'Session refreshed successfully';
    case AuthEventType.SESSION_EXPIRED:
      return 'Session expired';
    case AuthEventType.TOKEN_REFRESH_FAILURE:
      return 'Failed to refresh authentication token';
    case AuthEventType.INVALID_TOKEN:
      return 'Invalid authentication token';
    case AuthEventType.MISSING_TOKEN:
      return 'Missing authentication token';
    case AuthEventType.COMPANY_VALIDATION:
      return 'Company validation performed';
    case AuthEventType.COMPANY_SWITCH:
      return 'User switched company context';
    case AuthEventType.RATE_LIMIT_EXCEEDED:
      return 'Rate limit exceeded for authentication attempts';
    case AuthEventType.PERMISSION_DENIED:
      return 'Permission denied for the requested resource';
    default:
      return 'Authentication event occurred';
  }
}

/**
 * Get the appropriate console method for the log level
 */
function getConsoleMethod(level: LogLevel): (message: string, ...args: any[]) => void {
  switch (level) {
    case 'debug':
      return console.debug;
    case 'info':
      return console.log;
    case 'warn':
      return console.warn;
    case 'error':
      return console.error;
    default:
      return console.log;
  }
}

/**
 * Format error object for logging
 */
function formatError(error: any): any {
  if (!error) return null;
  
  // If it's a string, return it directly
  if (typeof error === 'string') return error;
  
  // If it's an Error object, extract useful properties
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
  
  // If it's a plain object with message, return it
  if (error.message) {
    return {
      message: error.message,
      ...error
    };
  }
  
  // Otherwise, return the error as is
  return error;
} 