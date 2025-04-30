import { Table, TableSession } from "@prisma/client";

/**
 * Calculate the current duration of an active session in minutes
 */
export const calculateSessionDuration = (session: TableSession): number => {
  const startTime = new Date(session.startedAt);
  const endTime = session.endedAt ? new Date(session.endedAt) : new Date();
  
  // Calculate difference in milliseconds and convert to minutes
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.floor(durationMs / (1000 * 60));
};

/**
 * Calculate the current cost of an active session
 */
export const calculateSessionCost = (
  session: TableSession, 
  table: Table
): number => {
  if (!table.hourlyRate) return 0;

  const durationMinutes = calculateSessionDuration(session);
  const hourlyRate = parseFloat(table.hourlyRate.toString());
  
  // Calculate cost: hourlyRate × minutes ÷ 60
  return (hourlyRate * durationMinutes) / 60;
};

/**
 * Format a price value for display
 */
export const formatPrice = (price: number): string => {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });
};

/**
 * Format minutes into a human-readable time string (1h 30m)
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
}; 