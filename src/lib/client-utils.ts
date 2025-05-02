/**
 * Safely access localStorage - prevents errors during server-side rendering
 */

// Check if we're running in a browser environment
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Safely get an item from localStorage
 * @param key The key to retrieve
 * @returns The value or null if not found or if not in browser
 */
export const getLocalStorage = (key: string): string | null => {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting localStorage key "${key}":`, error);
    return null;
  }
};

/**
 * Safely set an item in localStorage
 * @param key The key to set
 * @param value The value to store
 * @returns True if successful, false otherwise
 */
export const setLocalStorage = (key: string, value: string): boolean => {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Safely remove an item from localStorage
 * @param key The key to remove
 * @returns True if successful, false otherwise
 */
export const removeLocalStorage = (key: string): boolean => {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Get a cookie value by name
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  if (!isBrowser()) return null;
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  } catch (error) {
    console.error(`Error getting cookie "${name}":`, error);
    return null;
  }
};

/**
 * Set a cookie value
 * @param name Cookie name
 * @param value Cookie value
 * @param days Expiration in days
 * @returns True if successful, false otherwise
 */
export const setCookie = (name: string, value: string, days: number = 7): boolean => {
  if (!isBrowser()) return false;
  try {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}${expires}; path=/`;
    return true;
  } catch (error) {
    console.error(`Error setting cookie "${name}":`, error);
    return false;
  }
}; 