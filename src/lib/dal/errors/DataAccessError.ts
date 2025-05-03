/**
 * Error types for data access operations
 */
export type DataAccessErrorType =
  | 'query_error'
  | 'insert_error'
  | 'update_error'
  | 'delete_error'
  | 'validation_error'
  | 'not_found'
  | 'unauthorized'
  | 'unknown_error';

/**
 * Custom error class for data access operations
 * Provides structured error information for debugging and error handling
 */
export class DataAccessError extends Error {
  public readonly originalError: any;
  public readonly type: DataAccessErrorType;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  
  /**
   * Create a new DataAccessError
   * @param message Error message
   * @param originalError Original error object
   * @param type Error type
   * @param context Additional context information
   */
  constructor(
    message: string,
    originalError: any,
    type: DataAccessErrorType,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DataAccessError';
    this.originalError = originalError;
    this.type = type;
    this.timestamp = new Date();
    this.context = context;
    
    // Log error details
    this.logError();
  }
  
  /**
   * Log error details for debugging
   */
  private logError(): void {
    // Only log in development or server-side
    if (process.env.NODE_ENV === 'development' || typeof window === 'undefined') {
      console.error(`[DataAccessError][${this.type}] ${this.message}`, {
        timestamp: this.timestamp.toISOString(),
        type: this.type,
        message: this.message,
        context: this.context,
        originalError: this.originalError
      });
    }
  }
  
  /**
   * Get a friendly error message for display to users
   */
  public getFriendlyMessage(): string {
    switch (this.type) {
      case 'query_error':
        return 'There was a problem retrieving the requested data.';
      case 'insert_error':
        return 'There was a problem creating the new record.';
      case 'update_error':
        return 'There was a problem updating the record.';
      case 'delete_error':
        return 'There was a problem deleting the record.';
      case 'validation_error':
        return 'The data provided is invalid or incomplete.';
      case 'not_found':
        return 'The requested record could not be found.';
      case 'unauthorized':
        return 'You do not have permission to perform this operation.';
      case 'unknown_error':
      default:
        return 'An unexpected error occurred while processing your request.';
    }
  }
  
  /**
   * Convert error to JSON for API responses
   */
  public toJSON(): Record<string, any> {
    return {
      error: {
        type: this.type,
        message: this.getFriendlyMessage(),
        timestamp: this.timestamp.toISOString()
      }
    };
  }
  
  /**
   * Utility to create a not found error
   * @param entityName Name of the entity that wasn't found
   * @param id ID that was searched for
   */
  public static notFound(entityName: string, id: string): DataAccessError {
    return new DataAccessError(
      `${entityName} with id ${id} not found`,
      null,
      'not_found',
      { entityName, id }
    );
  }
  
  /**
   * Utility to create an unauthorized error
   * @param operation Operation that was attempted
   * @param entityName Name of the entity
   */
  public static unauthorized(operation: string, entityName: string): DataAccessError {
    return new DataAccessError(
      `Unauthorized to ${operation} ${entityName}`,
      null,
      'unauthorized',
      { operation, entityName }
    );
  }
} 