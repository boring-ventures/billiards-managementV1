# Secure Service Role Client Implementation

This document describes the implementation of secure service role client and admin API endpoints.

## Overview

We've implemented a secure service role client for server-side operations that require bypassing Row Level Security (RLS) policies. This implementation provides:

- Service role client that's restricted to server-side use only
- Admin API endpoints for cross-company operations
- Security logging for all privileged operations
- Multiple safeguards to prevent client-side usage

## Implementation Details

### Service Role Client

The primary implementation is in `src/lib/serverClient.ts`, which:

1. Uses `server-only` package to prevent client-side imports
2. Has runtime checks to prevent execution in browser environments
3. Requires the `SUPABASE_SERVICE_ROLE_KEY` environment variable
4. Provides standardized error handling and audit logging

### Audit Logging

All operations performed with service role privileges are logged to the `admin_audit_logs` table, which:

1. Records the operation type, details, user who performed it, and timestamp
2. Is protected by RLS policies to prevent unauthorized access
3. Cannot be modified or deleted once entries are created
4. Is accessible only to superadmins for compliance and auditing

### Admin API Endpoints

The following API endpoints were implemented with strict access control:

1. `/api/admin/companies` - Manage companies across the platform
2. `/api/admin/users` - Manage users across all companies
3. `/api/admin/audit-logs` - View security audit logs

All admin endpoints use the `verifySuperAdmin` middleware which:
- Verifies the user has superadmin privileges (from JWT or database)
- Logs attempted unauthorized access for security monitoring
- Returns standardized error responses for better security

### Cross-Company Data Utilities

The `src/lib/admin/crossCompanyData.ts` module provides:

1. Functions to fetch data across all companies
2. Aggregation utilities for cross-company analytics
3. Comparison tools for multi-company reporting
4. Strong type safety and security checks

### Database Stored Procedures

To support these features, we've added:

1. `get_user_counts_by_company()` - Gets user counts per company
2. `get_user_stats_by_company_role()` - Gets user counts by company and role
3. `get_admin_audit_logs()` - Retrieves audit logs with performer information

## Security Considerations

1. Service role key is required in environment variables
2. All operations require superadmin privileges 
3. All admin operations are logged for security auditing
4. Multiple layers of validation to prevent unauthorized access
5. RLS policies protect audit logs and sensitive operations

## Usage Examples

### Using the Server Client (Server-Side Only)

```typescript
import { serverClient, logAdminOperation } from '@/lib/serverClient';

// Fetch data across companies
const { data } = await serverClient
  .from('companies')
  .select('*');

// Log the operation for security auditing
await logAdminOperation(
  'VIEW_ALL_COMPANIES',
  { count: data.length },
  currentUserId
);
```

### Creating an Admin API Route

```typescript
import { verifySuperAdmin } from '@/lib/middleware/adminApiAuth';

export async function GET(req: NextRequest) {
  // Verify superadmin access
  const authResponse = await verifySuperAdmin(req, 'OPERATION_NAME');
  if (authResponse) return authResponse;
  
  // Proceed with admin operation
  // ...
}
```

## Next Steps

- Implement more fine-grained access control as needed
- Add more cross-company analytics endpoints
- Create admin UI for viewing audit logs 