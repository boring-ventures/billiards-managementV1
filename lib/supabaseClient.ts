/**
 * @deprecated Use src/lib/supabase/client.ts instead 
 * This file is maintained for backward compatibility only
 */
import { getSupabaseClient, getSupabaseJS } from '@/lib/supabase/client';

// Re-export the client from the canonical source
export const supabase = () => getSupabaseClient();

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