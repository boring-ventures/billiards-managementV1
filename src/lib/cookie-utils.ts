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
    return Cookies.get(key);
  },
  
  /**
   * Set cookie with options
   * @param key The cookie key
   * @param value The cookie value
   * @param options Cookie options (expires, secure, sameSite, etc.)
   */
  set: (key: string, value: string, options?: Cookies.CookieAttributes): void => {
    if (typeof window === 'undefined') return;
    
    // Set secure by default in production
    const isProduction = process.env.NODE_ENV === 'production';
    const secureByDefault = isProduction && options?.secure !== false;
    
    Cookies.set(key, value, {
      ...options,
      secure: secureByDefault || options?.secure,
      sameSite: options?.sameSite || 'lax',
    });
  },
  
  /**
   * Remove cookie
   * @param key The cookie key to remove
   * @param options Cookie options (path, domain, etc.)
   */
  remove: (key: string, options?: Cookies.CookieAttributes): void => {
    if (typeof window === 'undefined') return;
    Cookies.remove(key, options);
  },
  
  /**
   * Clear all auth cookies
   */
  clearAuthCookies: (): void => {
    if (typeof window === 'undefined') return;
    Cookies.remove(AUTH_TOKEN_COOKIE);
    Cookies.remove(REFRESH_TOKEN_COOKIE);
    Cookies.remove(COMPANY_SELECTION_COOKIE);
    Cookies.remove(VIEW_MODE_COOKIE);
    Cookies.remove(USER_ID_COOKIE);
    Cookies.remove(FALLBACK_PROFILE_COOKIE);
  }
};

// Helper function to determine if we're on the client
export const isClient = typeof window !== 'undefined'; 