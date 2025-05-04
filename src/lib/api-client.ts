/**
 * API client for making authenticated requests to backend APIs
 * This is safe to use in both client and server components
 */

import { getSupabaseClient } from './supabase/client';

/**
 * Make an authenticated API request to our own backend
 * This adds the necessary auth headers and handles errors consistently
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Get a Supabase client instance
    const supabase = getSupabaseClient();

    // Try to get the current session
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    // Build the request URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/api/${endpoint.replace(/^\//, '')}`;

    // Set up default headers
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    
    // Add auth header if we have a session
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    // Parse the response
    const contentType = response.headers.get('content-type');
    let result;

    if (contentType?.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    // Check if the request was successful
    if (!response.ok) {
      return {
        data: null,
        error: new Error(
          typeof result === 'string'
            ? result
            : result.error || result.message || 'API request failed'
        ),
      };
    }

    // Return the successful response
    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * API utilities for common operations
 */
export const api = {
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data: T | null; error: Error | null }> {
    return apiRequest<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T = any>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: Error | null }> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put<T = any>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: Error | null }> {
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: Error | null }> {
    return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
  },
}; 