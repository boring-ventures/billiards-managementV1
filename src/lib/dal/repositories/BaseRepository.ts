import { serverClient } from '@/lib/serverClient';
import { RequestCache } from '../cache/RequestCache';
import { DataAccessError } from '../errors/DataAccessError';

/**
 * Base repository class that provides common functionality for data access
 * Implements flexible companyId handling and basic CRUD operations
 */
export abstract class BaseRepository<T> {
  protected tableName: string;
  protected cache: RequestCache;
  
  constructor(tableName: string) {
    this.tableName = tableName;
    this.cache = RequestCache.getInstance();
  }
  
  /**
   * Get all entities with flexible company filtering
   * @param companyId Optional company ID filter, if not provided uses the user's default company
   * @param options Query options like select, order, filters
   */
  async getAll(
    companyId?: string | null,
    options: {
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      filters?: Record<string, any>;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<T[]> {
    try {
      // Generate cache key
      const cacheKey = `${this.tableName}_getAll_${companyId ?? 'all'}_${JSON.stringify(options)}`;
      
      // Check cache first
      const cachedData = this.cache.get<T[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Build query
      let query = serverClient
        .from(this.tableName)
        .select(options.select || '*');
      
      // Apply company filter if provided
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      // Apply custom filters if provided
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value === null) {
            query = query.is(key, null);
          } else if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
            query = query.ilike(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }
      
      // Apply ordering if specified
      if (options.orderBy) {
        query = query.order(
          options.orderBy.column,
          { ascending: options.orderBy.ascending ?? true }
        );
      }
      
      // Apply pagination if specified
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        throw new DataAccessError(
          `Error fetching ${this.tableName}`,
          error,
          'query_error'
        );
      }
      
      // Cache results
      this.cache.set(cacheKey, data);
      
      return data as T[];
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ${this.tableName}.getAll`,
        error,
        'unknown_error'
      );
    }
  }
  
  /**
   * Get entity by ID with flexible company validation
   * @param id Entity ID
   * @param companyId Optional company ID for validation, if not provided uses the user's default company
   * @param select Fields to select
   */
  async getById(id: string, companyId?: string | null, select: string = '*'): Promise<T | null> {
    try {
      // Generate cache key
      const cacheKey = `${this.tableName}_${id}_${companyId ?? 'any'}_${select}`;
      
      // Check cache first
      const cachedData = this.cache.get<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Build query
      let query = serverClient
        .from(this.tableName)
        .select(select)
        .eq('id', id);
      
      // Add company filter if provided
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      // Execute query
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        throw new DataAccessError(
          `Error fetching ${this.tableName} with id ${id}`,
          error,
          'query_error'
        );
      }
      
      // Cache results
      this.cache.set(cacheKey, data);
      
      return data as T;
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ${this.tableName}.getById`,
        error,
        'unknown_error'
      );
    }
  }
  
  /**
   * Create a new entity with company ID handling
   * @param data Entity data
   * @param companyId Optional company ID to associate, if not provided uses the user's default company
   */
  async create(data: Partial<T>, companyId?: string): Promise<T> {
    try {
      // Add company_id if provided and not already in data
      const entityData: any = { ...data };
      if (companyId && !('company_id' in entityData)) {
        entityData.company_id = companyId;
      }
      
      // Execute insert
      const { data: createdData, error } = await serverClient
        .from(this.tableName)
        .insert(entityData)
        .select()
        .single();
      
      if (error) {
        throw new DataAccessError(
          `Error creating ${this.tableName}`,
          error,
          'insert_error'
        );
      }
      
      // Invalidate relevant cache entries
      this.cache.invalidatePattern(`${this.tableName}_getAll`);
      
      return createdData as T;
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ${this.tableName}.create`,
        error,
        'unknown_error'
      );
    }
  }
  
  /**
   * Update an entity with company validation
   * @param id Entity ID
   * @param data Updated data
   * @param companyId Optional company ID for validation, if not provided company validation is skipped
   */
  async update(id: string, data: Partial<T>, companyId?: string): Promise<T | null> {
    try {
      // Build query
      let query = serverClient
        .from(this.tableName)
        .update(data);
      
      // Add ID filter
      query = query.eq('id', id);
      
      // Add company validation if provided
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      // Execute update
      const { data: updatedData, error } = await query
        .select()
        .single();
      
      if (error) {
        throw new DataAccessError(
          `Error updating ${this.tableName} with id ${id}`,
          error,
          'update_error'
        );
      }
      
      // Invalidate relevant cache entries
      this.cache.invalidatePattern(`${this.tableName}_`);
      
      return updatedData as T;
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ${this.tableName}.update`,
        error,
        'unknown_error'
      );
    }
  }
  
  /**
   * Delete an entity with company validation
   * @param id Entity ID
   * @param companyId Optional company ID for validation, if not provided company validation is skipped
   */
  async delete(id: string, companyId?: string): Promise<boolean> {
    try {
      // Build query
      let query = serverClient
        .from(this.tableName)
        .delete();
      
      // Add ID filter
      query = query.eq('id', id);
      
      // Add company validation if provided
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      // Execute delete
      const { error } = await query;
      
      if (error) {
        throw new DataAccessError(
          `Error deleting ${this.tableName} with id ${id}`,
          error,
          'delete_error'
        );
      }
      
      // Invalidate relevant cache entries
      this.cache.invalidatePattern(`${this.tableName}_`);
      
      return true;
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ${this.tableName}.delete`,
        error,
        'unknown_error'
      );
    }
  }
} 