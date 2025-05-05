/**
 * Centralized logging utilities for consistent logging format and features
 */

// Get environment information
const isVercel = process.env.VERCEL === '1';
const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG === 'true';

/**
 * Structured logging with timing information
 */
export function logWithMetrics(
  category: string,
  message: string,
  durationMs?: number,
  data?: Record<string, any>
): void {
  const environment = isVercel ? 'Vercel' : 'Local';
  const timestamp = new Date().toISOString();
  
  const logObject = {
    timestamp,
    environment,
    category,
    message,
    ...(durationMs !== undefined ? { durationMs: `${durationMs.toFixed(2)}ms` } : {}),
    ...(data || {})
  };
  
  // For development, format logs to be more readable
  if (isDev) {
    const durationText = durationMs !== undefined ? ` (${durationMs.toFixed(2)}ms)` : '';
    console.log(`[${environment}][${category}] ${message}${durationText}`, data || '');
  } else {
    // In production, use structured JSON logging for better parsing
    console.log(JSON.stringify(logObject));
  }
}

/**
 * Log an error with context
 */
export function logError(
  category: string, 
  message: string, 
  error: any, 
  data?: Record<string, any>
): void {
  const errorDetails = error instanceof Error 
    ? { 
        message: error.message, 
        stack: isDev || isDebug ? error.stack : undefined,
        name: error.name
      } 
    : { message: String(error) };

  logWithMetrics(
    category, 
    `ERROR: ${message}`, 
    undefined, 
    {
      error: errorDetails,
      ...data
    }
  );
}

/**
 * Start a timer for performance measurement
 * Returns milliseconds timestamp that works in all environments including Vercel
 */
export function startTimer(): number {
  return Date.now();
}

/**
 * End a timer and return duration in milliseconds
 */
export function endTimer(start: number): number {
  return Date.now() - start;
}

/**
 * Log a performance metric
 */
export function logPerformance(
  category: string,
  operation: string, 
  durationMs: number,
  data?: Record<string, any>
): void {
  logWithMetrics(
    category, 
    `Performance: ${operation}`, 
    durationMs, 
    {
      operation,
      ...data
    }
  );
} 