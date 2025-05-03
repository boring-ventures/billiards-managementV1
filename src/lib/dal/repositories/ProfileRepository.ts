import { BaseRepository } from './BaseRepository';
import { Profile } from '../models/Profile';
import { ProfileDTO, PROFILE_FIELD_ACCESS } from '../dtos/ProfileDTO';
import { DTOConverter, UserRole } from '../dtos/BaseDTO';
import { DataAccessError } from '../errors/DataAccessError';
import { serverClient } from '@/lib/serverClient';

/**
 * Repository for Profile entity operations
 * Implements flexible companyId handling and role-based data access
 */
export class ProfileRepository extends BaseRepository<Profile> {
  constructor() {
    super('profiles');
  }
  
  /**
   * Get profile by user ID with optional company validation
   * @param userId User ID
   * @param companyId Optional company ID for validation
   * @param userRole Role of the user making the request
   */
  async getProfileByUserId(
    userId: string,
    companyId?: string | null,
    userRole: UserRole = 'USER'
  ): Promise<ProfileDTO | null> {
    try {
      const cacheKey = `profiles_user_${userId}_${companyId ?? 'any'}`;
      
      // Check cache first
      const cachedData = this.cache.get<Profile>(cacheKey);
      if (cachedData) {
        return this.toProfileDTO(cachedData, userRole);
      }
      
      // Build query
      let query = serverClient
        .from(this.tableName)
        .select('*')
        .eq('userId', userId);
      
      // Add company validation if provided and not a superadmin
      if (companyId && userRole !== 'SUPERADMIN') {
        query = query.eq('companyId', companyId);
      }
      
      // Execute query
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found
          return null;
        }
        throw new DataAccessError(
          `Error fetching profile for user ${userId}`,
          error,
          'query_error'
        );
      }
      
      // Cache results
      this.cache.set(cacheKey, data);
      
      return this.toProfileDTO(data as Profile, userRole);
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ProfileRepository.getProfileByUserId`,
        error,
        'unknown_error'
      );
    }
  }
  
  /**
   * Get profiles by company ID with role-based filtering
   * @param companyId Company ID
   * @param options Query options
   * @param userRole Role of the user making the request
   */
  async getProfilesByCompany(
    companyId: string,
    options: {
      active?: boolean;
      roles?: string[];
      search?: string;
      limit?: number;
      page?: number;
      orderBy?: { column: string; ascending?: boolean };
    } = {},
    userRole: UserRole = 'USER'
  ): Promise<{ profiles: ProfileDTO[]; total: number }> {
    try {
      // Build query for count
      let countQuery = serverClient
        .from(this.tableName)
        .select('id', { count: 'exact' })
        .eq('companyId', companyId);
      
      // Build query for data
      let dataQuery = serverClient
        .from(this.tableName)
        .select('*')
        .eq('companyId', companyId);
      
      // Apply active filter if provided
      if (options.active !== undefined) {
        countQuery = countQuery.eq('active', options.active);
        dataQuery = dataQuery.eq('active', options.active);
      }
      
      // Apply role filter if provided
      if (options.roles && options.roles.length > 0) {
        countQuery = countQuery.in('role', options.roles);
        dataQuery = dataQuery.in('role', options.roles);
      }
      
      // Apply search filter if provided
      if (options.search) {
        const searchPattern = `%${options.search}%`;
        countQuery = countQuery.or(`firstName.ilike.${searchPattern},lastName.ilike.${searchPattern},email.ilike.${searchPattern}`);
        dataQuery = dataQuery.or(`firstName.ilike.${searchPattern},lastName.ilike.${searchPattern},email.ilike.${searchPattern}`);
      }
      
      // Apply ordering if specified
      if (options.orderBy) {
        dataQuery = dataQuery.order(
          options.orderBy.column,
          { ascending: options.orderBy.ascending ?? true }
        );
      } else {
        // Default ordering by firstName
        dataQuery = dataQuery.order('firstName', { ascending: true });
      }
      
      // Apply pagination if specified
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        dataQuery = dataQuery.range(from, to);
      } else if (options.limit) {
        dataQuery = dataQuery.limit(options.limit);
      }
      
      // Execute queries in parallel
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
      ]);
      
      if (countResult.error) {
        throw new DataAccessError(
          `Error counting profiles for company ${companyId}`,
          countResult.error,
          'query_error'
        );
      }
      
      if (dataResult.error) {
        throw new DataAccessError(
          `Error fetching profiles for company ${companyId}`,
          dataResult.error,
          'query_error'
        );
      }
      
      // Convert to DTOs with role-based field filtering
      const profileDTOs = (dataResult.data as Profile[]).map(profile => 
        this.toProfileDTO(profile, userRole)
      );
      
      return {
        profiles: profileDTOs,
        total: countResult.count || 0
      };
    } catch (error) {
      if (error instanceof DataAccessError) {
        throw error;
      }
      throw new DataAccessError(
        `Unexpected error in ProfileRepository.getProfilesByCompany`,
        error,
        'unknown_error'
      );
    }
  }
  
  /**
   * Convert Profile entity to ProfileDTO with role-based field filtering
   * @param profile Profile entity
   * @param userRole Role of the user making the request
   */
  private toProfileDTO(profile: Profile, userRole: UserRole): ProfileDTO {
    // Create a base DTO
    const dto = DTOConverter.toDTO<ProfileDTO, Profile>(
      profile,
      PROFILE_FIELD_ACCESS,
      userRole
    );
    
    // Add derived fields
    dto.fullName = `${profile.firstName} ${profile.lastName}`.trim();
    
    return dto;
  }
} 