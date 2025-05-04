import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton instance
let clientInstance: ReturnType<typeof createClient> | null = null;

// Create and get Supabase client using singleton pattern
export const supabase = () => {
  if (typeof window === 'undefined') {
    // For server-side usage, create a new instance each time
    // Server-side doesn't have the multiple instance issue
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  // For client-side, use singleton pattern
  if (clientInstance) {
    return clientInstance;
  }
  
  console.log('[Global] Creating singleton Supabase client');
  clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  return clientInstance;
};

// Helper function to handle Supabase errors consistently
export function handleSupabaseError(error: any, operation: string): Error {
  console.error(`Error during ${operation}:`, error);
  
  // Format a user-friendly error message
  const message = error.message || 'An unexpected error occurred';
  const details = error.details ? `: ${error.details}` : '';
  const code = error.code ? ` (Code: ${error.code})` : '';
  
  return new Error(`${message}${details}${code}`);
}

// Database table names for reference
export const TABLES = {
  PROFILES: 'profiles',
  COMPANIES: 'companies',
  ACTIVITY_LOGS: 'activity_logs',
  FINANCE_REPORTS: 'finance_reports',
  FINANCE_TRANSACTIONS: 'finance_transactions',
  FINANCE_CATEGORIES: 'finance_categories',
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_CATEGORIES: 'inventory_categories',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  POS_ORDERS: 'pos_orders',
  POS_ORDER_ITEMS: 'pos_order_items',
  TABLES: 'tables',
  TABLE_SESSIONS: 'table_sessions',
  TABLE_RESERVATIONS: 'table_reservations',
}; 