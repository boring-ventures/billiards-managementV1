import Cookies from 'js-cookie';

// Constants for cookie names
export const AUTH_TOKEN_COOKIE = 'sb-auth-token';
export const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
export const COMPANY_SELECTION_COOKIE = 'selected-company-id';
export const VIEW_MODE_COOKIE = 'view-mode';
export const USER_ID_COOKIE = 'current-user-id';
export const FALLBACK_PROFILE_COOKIE = 'fallback-profile';

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
   * Set cookie with options
   * @param key The cookie key
   * @param value The cookie value
   * @param options Cookie options (expires, secure, sameSite, etc.)
   */
  set: (key: string, value: string, options?: Cookies.CookieAttributes): void => {
    if (typeof window === 'undefined') return;
    
    try {
      // Set secure by default in production
      const isProduction = process.env.NODE_ENV === 'production';
      const secureByDefault = isProduction && options?.secure !== false;
      
      // Always set path to '/' by default for consistency
      const path = options?.path || '/';
      
      Cookies.set(key, value, {
        ...options,
        secure: secureByDefault || options?.secure,
        sameSite: options?.sameSite || 'lax',
        path,
      });
      
      // Verify cookie was set
      if (!Cookies.get(key) && key.startsWith('sb-')) {
        console.warn(`Warning: Cookie ${key} may not have been set properly`);
      }
    } catch (error) {
      console.error(`Error setting cookie ${key}:`, error);
    }
  },
  
  /**
   * Remove cookie
   * @param key The cookie key to remove
   * @param options Cookie options (path, domain, etc.)
   */
  remove: (key: string, options?: Cookies.CookieAttributes): void => {
    if (typeof window === 'undefined') return;
    
    try {
      // Always set path to '/' by default for consistency with set method
      const path = options?.path || '/';
      
      Cookies.remove(key, { ...options, path });
    } catch (error) {
      console.error(`Error removing cookie ${key}:`, error);
    }
  },
  
  /**
   * Clear all auth cookies
   */
  clearAuthCookies: (): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const cookies = [
        AUTH_TOKEN_COOKIE,
        REFRESH_TOKEN_COOKIE,
        COMPANY_SELECTION_COOKIE,
        VIEW_MODE_COOKIE,
        USER_ID_COOKIE,
        FALLBACK_PROFILE_COOKIE
      ];
      
      // Remove each cookie with consistent path
      cookies.forEach(cookie => {
        Cookies.remove(cookie, { path: '/' });
      });
    } catch (error) {
      console.error('Error clearing auth cookies:', error);
    }
  }
};

// Helper function to determine if we're on the client
export const isClient = typeof window !== 'undefined'; 