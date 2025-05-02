# Authentication Metadata Implementation

This document describes the implementation of auth metadata storage in the application.

## Overview

We've enhanced the authentication system to store user roles and company assignments in Supabase JWT claims via `app_metadata`. This provides several benefits:

- Reduced database queries for role/company information
- Improved security by having role information verified by the JWT issuer
- Better performance for authentication checks

## Implementation Details

### App Metadata Structure

The app_metadata structure in the JWT token contains:

```json
{
  "role": "USER" | "SELLER" | "ADMIN" | "SUPERADMIN",
  "companyId": "uuid-of-company" | null,
  "initialized": true
}
```

### Authentication Flow

1. When a user signs up or is created, we initialize their app_metadata with default values
2. When roles or company assignments change, we update both the database Profile and the app_metadata
3. During authentication, we first check JWT claims for role/company information
4. If JWT claims are not present or not initialized, we fall back to database lookups

### Helper Functions

The implementation adds several helper functions in `src/lib/auth-metadata.ts`:

- `updateUserAuthMetadata()` - Update a user's app_metadata
- `initializeUserMetadata()` - Initialize metadata for a new user
- `updateUserRole()` - Update only the role in app_metadata
- `updateUserCompany()` - Update only the companyId in app_metadata
- `getAuthMetadataFromSession()` - Get metadata from the current session's JWT claims

### Existing Code Changes

The following files were updated to use the new metadata system:

1. `src/lib/auth.ts` - Updated to check JWT claims before database lookups
2. `src/lib/rbac.ts` - Modified role checking functions to use JWT claims
3. `src/lib/authUtils.ts` - Updated company ID retrieval to check JWT claims

### Migration Script

A migration script was created (`scripts/migrate-user-metadata.ts`) to populate app_metadata for existing users. Run this script once to migrate all users:

```bash
npm run migrate-metadata
# or
node -r ts-node/register scripts/migrate-user-metadata.ts
```

## Important Notes

1. The service role key is required for updating app_metadata - make sure `SUPABASE_SERVICE_ROLE_KEY` is set in your environment variables
2. All functions that modify user metadata are server-side only
3. The system maintains backward compatibility by keeping both the database Profile and app_metadata in sync

## Next Steps

- Test the implementation thoroughly with different user roles and scenarios
- Monitor performance improvements from reduced database queries
- Consider implementing a periodic sync mechanism to ensure database and JWT claims stay in sync 