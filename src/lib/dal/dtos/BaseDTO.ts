/**
 * Base interface for all Data Transfer Objects (DTOs)
 * Used to standardize the shape of data returned to clients
 * and provide role-based field filtering
 */
export interface BaseDTO {
  id: string;
  createdAt?: string; // ISO 8601 date string
  updatedAt?: string; // ISO 8601 date string
}

/**
 * User roles in the system
 */
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'USER' | 'GUEST';

/**
 * Role-specific field access mapper
 * Used to determine which fields should be included/excluded for each role
 */
export interface FieldAccessMap {
  // Fields that should be included for all roles
  common: string[];
  
  // Role-specific field inclusions
  roles: {
    [key in UserRole]?: string[];
  };
  
  // Fields that should be explicitly excluded for specific roles
  excludeForRoles?: {
    [key in UserRole]?: string[];
  };
}

/**
 * Utility class for converting between database entities and DTOs
 * with role-based field filtering
 */
export class DTOConverter {
  /**
   * Convert a database entity to a DTO with role-based field filtering
   * @param entity Database entity
   * @param fieldAccess Field access configuration
   * @param userRole User role for field filtering
   */
  static toDTO<T extends BaseDTO, E>(
    entity: E,
    fieldAccess: FieldAccessMap,
    userRole: UserRole = 'USER'
  ): T {
    if (!entity) return null as any;
    
    // Start with an empty object
    const dto: Record<string, any> = {};
    
    // Add all common fields
    fieldAccess.common.forEach(field => {
      if (field in (entity as any)) {
        dto[field] = (entity as any)[field];
      }
    });
    
    // Add role-specific fields
    // Include all fields for higher roles in the hierarchy
    const roleHierarchy: UserRole[] = ['GUEST', 'USER', 'STAFF', 'ADMIN', 'SUPERADMIN'];
    const roleIndex = roleHierarchy.indexOf(userRole);
    
    // Add fields for the user's role and all lower roles in the hierarchy
    for (let i = 0; i <= roleIndex; i++) {
      const role = roleHierarchy[i];
      const roleFields = fieldAccess.roles[role];
      
      if (roleFields) {
        roleFields.forEach(field => {
          if (field in (entity as any)) {
            dto[field] = (entity as any)[field];
          }
        });
      }
    }
    
    // Remove excluded fields for the user's role
    if (fieldAccess.excludeForRoles?.[userRole]) {
      fieldAccess.excludeForRoles[userRole]!.forEach(field => {
        delete dto[field];
      });
    }
    
    return dto as T;
  }
  
  /**
   * Convert multiple database entities to DTOs with role-based field filtering
   * @param entities Array of database entities
   * @param fieldAccess Field access configuration
   * @param userRole User role for field filtering
   */
  static toDTOArray<T extends BaseDTO, E>(
    entities: E[],
    fieldAccess: FieldAccessMap,
    userRole: UserRole = 'USER'
  ): T[] {
    if (!entities || !Array.isArray(entities)) return [];
    
    return entities.map(entity => 
      this.toDTO<T, E>(entity, fieldAccess, userRole)
    );
  }
} 