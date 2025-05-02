import Cookies from 'js-cookie';

// Constants for cookie names
export const AUTH_TOKEN_COOKIE = 'sb-auth-token';
export const COMPANY_SELECTION_COOKIE = 'selected-company-id';
export const VIEW_MODE_COOKIE = 'view-mode';
export const USER_ID_COOKIE = 'current-user-id';
export const FALLBACK_PROFILE_COOKIE = 'fallback-profile';

// Client-side cookie utilities
export const cookieUtils = {
  get: (name: string) => {
    if (typeof window === 'undefined') return null;
    return Cookies.get(name);
  },
  
  set: (name: string, value: string, options?: { expires?: number, secure?: boolean, path?: string, sameSite?: 'strict' | 'lax' | 'none' }) => {
    if (typeof window === 'undefined') return;
    
    // Set secure by default in production
    const isProduction = process.env.NODE_ENV === 'production';
    const secureByDefault = isProduction && options?.secure !== false;
    
    Cookies.set(name, value, {
      ...options,
      secure: secureByDefault || options?.secure,
      sameSite: options?.sameSite || 'lax',
    });
  },
  
  remove: (name: string) => {
    if (typeof window === 'undefined') return;
    Cookies.remove(name);
  },
  
  // Clear all auth-related cookies
  clearAuthCookies: () => {
    if (typeof window === 'undefined') return;
    Cookies.remove(AUTH_TOKEN_COOKIE);
    Cookies.remove(COMPANY_SELECTION_COOKIE);
    Cookies.remove(VIEW_MODE_COOKIE);
    Cookies.remove(USER_ID_COOKIE);
    Cookies.remove(FALLBACK_PROFILE_COOKIE);
  }
};

// Helper function to determine if we're on the client
export const isClient = typeof window !== 'undefined'; 