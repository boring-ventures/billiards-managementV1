import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple debug status endpoint
 * Provides basic information about the application environment
 * without depending on cookies/auth to help debug deployment issues
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Collect request info
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const accept = req.headers.get('accept') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const isBrowser = accept.includes('text/html');
    
    // Build the status response with just environment info
    const status = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        env: process.env.NODE_ENV || 'unknown',
        isVercel: process.env.VERCEL === '1',
        region: process.env.VERCEL_REGION || 'unknown',
      },
      request: {
        method: req.method,
        url: req.url,
        userAgent,
        isBrowser,
        acceptLanguage: acceptLanguage.split(',')[0] || '',
        isSecure: req.headers.get('x-forwarded-proto') === 'https',
      },
      performance: {
        responseTimeMs: Date.now() - startTime
      }
    };
    
    // Return status info
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error getting debug status',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 