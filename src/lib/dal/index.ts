/**
 * Data Access Layer (DAL) entry point
 * Exports all repositories and utilities for data access
 */

// Models
export * from './models/Profile';

// DTOs
export * from './dtos/BaseDTO';
export * from './dtos/ProfileDTO';

// Repositories
export * from './repositories/BaseRepository';
export * from './repositories/ProfileRepository';

// Errors
export * from './errors/DataAccessError';

// Cache
export * from './cache/RequestCache';

// Repository instances
import { ProfileRepository } from './repositories/ProfileRepository';

// Export singleton instances of repositories
export const repositories = {
  profiles: new ProfileRepository(),
  // Add other repositories here
};

/**
 * Get a repository instance
 * @param name Repository name
 */
export function getRepository<T>(name: keyof typeof repositories): T {
  return repositories[name] as unknown as T;
} 