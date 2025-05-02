import Cookies from 'js-cookie';

// Constants for cookie names
export const AUTH_TOKEN_COOKIE = 'sb-auth-token';
export const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
export const ACCESS_TOKEN_COOKIE = 'sb-access-token';
export const COMPANY_SELECTION_COOKIE = 'company-selection';
export const VIEW_MODE_COOKIE = 'view-mode';
export const USER_ID_COOKIE = 'user-id';
export const FALLBACK_PROFILE_COOKIE = 'profile-fallback';

// Get current domain for cookie setting
// This makes cookies work in both development and production
function getCurrentDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  const hostname = window.location.hostname;
  
  // In development or on localhost, don't specify domain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }
  
  // For Vercel preview deployments
  if (hostname.includes('vercel.app')) {
    return hostname;
  }
  
  // For production, use root domain to make cookies work across subdomains
  const parts = hostname.split('.');
  if (parts.length > 2) {
    // Get the root domain (e.g., example.com from subdomain.example.com)
    return parts.slice(-2).join('.');
  }
  
  // Default to current hostname
  return hostname;
}

// Default cookie options
const getDefaultOptions = (): Cookies.CookieAttributes => {
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    domain: getCurrentDomain(),
    // Vercel environment cookies need special handling with short expiry times
    // because of how serverless functions work
    expires: 7 // 7 days default expiry
  };
};

// Client-side cookie utilities
export const cookieUtils = {
  /**
   * Get cookie value
   * @param key The cookie key
   * @returns The cookie value or undefined
   */
  get: (key: string): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    try {
      return Cookies.get(key);
    } catch (error) {
      console.error(`Error getting cookie ${key}:`, error);
      return undefined;
    }
  },

  /**
   * Set cookie value
   * @param key The cookie key
   * @param value The cookie value
   * @param options Optional cookie options
   */
  set: (
    key: string,
    value: string,
    options?: Cookies.CookieAttributes
  ): void => {
    if (typeof window === 'undefined') return;
    try {
      // Merge default options with provided options
      const mergedOptions = {
        ...getDefaultOptions(),
        ...options,
      };
      
      Cookies.set(key, value, mergedOptions);
      
      // Debug output for development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Cookie set: ${key} with options:`, mergedOptions);
      }
    } catch (error) {
      console.error(`Error setting cookie ${key}:`, error);
    }
  },

  /**
   * Remove cookie
   * @param key The cookie key
   * @param options Optional cookie options
   */
  remove: (key: string, options?: Cookies.CookieAttributes): void => {
    if (typeof window === 'undefined') return;
    try {
      // Merge default options with provided options
      const mergedOptions = {
        ...getDefaultOptions(),
        ...options,
      };
      
      Cookies.remove(key, mergedOptions);
    } catch (error) {
      console.error(`Error removing cookie ${key}:`, error);
    }
  },

  /**
   * Get all cookies as an object
   * @returns Object with all cookies
   */
  getAll: (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
      return Cookies.get();
    } catch (error) {
      console.error('Error getting all cookies:', error);
      return {};
    }
  },

  /**
   * Clear all auth-related cookies
   */
  clearAuthCookies: (): void => {
    if (typeof window === 'undefined') return;
    
    const options = getDefaultOptions();
    
    try {
      // Remove all auth cookies
      Cookies.remove(AUTH_TOKEN_COOKIE, options);
      Cookies.remove(REFRESH_TOKEN_COOKIE, options);
      Cookies.remove(ACCESS_TOKEN_COOKIE, options);
      
      // Also try removing with no domain specified (for cross-domain issues)
      Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
      Cookies.remove(REFRESH_TOKEN_COOKIE, { path: '/' });
      Cookies.remove(ACCESS_TOKEN_COOKIE, { path: '/' });
      
      // Remove Supabase default cookies as well
      Cookies.remove('sb-refresh-token', options);
      Cookies.remove('sb-access-token', options);
      Cookies.remove('supabase-auth-token', options);
      
      // Try no domain for Supabase cookies too
      Cookies.remove('sb-refresh-token', { path: '/' });
      Cookies.remove('sb-access-token', { path: '/' });
      Cookies.remove('supabase-auth-token', { path: '/' });
      
      console.log('All auth cookies cleared');
    } catch (error) {
      console.error('Error clearing auth cookies:', error);
    }
  }
};

// Helper function to determine if we're on the client
export const isClient = typeof window !== 'undefined'; 