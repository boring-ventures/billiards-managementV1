# Database Function Security Best Practices

## Search Path Parameter in PostgreSQL Functions

### Background

PostgreSQL uses a concept called the "search path" to determine which schemas to look in when resolving unqualified object names (tables, views, functions, etc. that are referenced without specifying a schema). By default, the search path is typically set to `"$user", public`, meaning PostgreSQL will first look in a schema matching the current user's name (if it exists), then fall back to the `public` schema.

The search path is a *session parameter* that can be modified during a database session. This creates a security vulnerability known as a "search path injection" when functions don't explicitly set their own search path.

### Issue: Function Search Path Mutability

Our analysis identified several database functions where the `search_path` parameter was not explicitly set:

- `public.get_user_counts_by_company`
- `public.get_user_stats_by_company_role`
- `public.get_admin_audit_logs`
- `public.is_superadmin`
- `public.is_admin_or_superadmin`
- `public.get_user_company_id`

Without an explicit `search_path` setting, these functions would inherit the search path from the calling session. This means that the behavior of these functions could be unpredictable if the session's search path was modified before calling the function.

### Solution: Explicitly Set Search Path

We've updated all database functions to explicitly set the search path using the `SET search_path = public` clause in the function definition. This ensures that our functions always use the `public` schema for object resolution, regardless of the calling session's settings.

Example of the fix:

```sql
-- Before
CREATE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- After
CREATE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$;
```

### Security Benefits

1. **Predictable Behavior**: Functions will always resolve table and other object references in the same way, regardless of calling context.

2. **Prevention of Search Path Attacks**: Eliminates the possibility of an attacker manipulating the search path to cause a function to access different objects than intended.

3. **Consistent Security Model**: Ensures all database functions follow the same security best practices.

### Implementation Details

These changes were implemented in the following files:

1. `supabase/migrations/20250515000000_fix_search_path.sql` - Migration to apply the fix to existing functions
2. `scripts/create-admin-stored-procedures.sql` - Updated template for creating admin functions
3. `simple_rls_functions.sql` - Updated RLS helper functions

### Additional Resources

- [PostgreSQL Documentation: Schema Search Path](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [PostgreSQL Documentation: Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [OWASP: SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) 