import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * This avoids className conflicts when using Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a currency value
 * @param amount The amount to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(amount);
}

/**
 * Formats a date to a readable string
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Truncates text with ellipsis if it exceeds the maximum length
 * @param text The text to truncate
 * @param maxLength The maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Calculates the percentage change between two numbers
 * @param current The current value
 * @param previous The previous value
 * @returns Percentage change as a string with % sign
 */
export function calculatePercentChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '∞%' : '0%';
  
  const percentChange = ((current - previous) / Math.abs(previous)) * 100;
  const sign = percentChange > 0 ? '+' : '';
  
  return `${sign}${percentChange.toFixed(1)}%`;
} 