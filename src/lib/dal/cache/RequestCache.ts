/**
 * Request-level cache for storing data within a single request lifecycle
 * Improves performance by preventing duplicate database queries within the same request
 */
export class RequestCache {
  private static instance: RequestCache;
  private cache: Map<string, { data: any; timestamp: number }>;
  private defaultTtl: number; // Time-to-live in milliseconds
  
  private constructor() {
    this.cache = new Map();
    this.defaultTtl = 5 * 60 * 1000; // 5 minutes default TTL
  }
  
  /**
   * Get the singleton instance of RequestCache
   */
  public static getInstance(): RequestCache {
    if (!RequestCache.instance) {
      RequestCache.instance = new RequestCache();
    }
    return RequestCache.instance;
  }
  
  /**
   * Get cached data by key
   * @param key Cache key
   * @returns Cached data or undefined if not found or expired
   */
  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.defaultTtl) {
      this.cache.delete(key); // Remove expired entry
      return undefined;
    }
    
    return entry.data as T;
  }
  
  /**
   * Store data in cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional time-to-live in milliseconds
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Delete a specific cache entry
   * @param key Cache key
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Delete all cache entries matching a pattern
   * @param pattern Pattern to match keys against
   */
  public invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
  }
  
  /**
   * Update the default TTL for cache entries
   * @param ttl New TTL in milliseconds
   */
  public setDefaultTtl(ttl: number): void {
    this.defaultTtl = ttl;
  }
} 