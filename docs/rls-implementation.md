# Row Level Security Implementation

This document explains the Row Level Security (RLS) policies implemented in the billiards-management application.

## Overview

Row Level Security (RLS) is a Postgres feature that provides fine-grained access control to database tables. It ensures that users can only access the data they are authorized to see or modify based on their role and company affiliation.

Our implementation follows these key principles:

1. **Company Isolation**: Users can only access data from their own company
2. **Role-Based Access**: Different levels of access based on user roles (USER, SELLER, ADMIN, SUPERADMIN)
3. **User-Specific Access**: Users can always access their own data
4. **Superadmin Override**: Superadmins can access all data across companies

## Helper Functions

We've created several helper functions to make policies more readable and maintainable:

- `is_superadmin()`: Checks if the current user has the SUPERADMIN role
- `is_admin_or_superadmin()`: Checks if the user has ADMIN or SUPERADMIN role
- `get_user_company_id()`: Returns the company ID of the current user

## Policy Types

Our RLS implementation includes several types of policies:

### 1. Company-Scoped Policies

These policies apply to tables with a `company_id` column. They ensure users can only access data from their own company:

```sql
CREATE POLICY "table_company_access_policy" 
ON public.table_name
FOR ALL
USING (
  (company_id = get_user_company_id())
  OR 
  is_superadmin()
);
```

### 2. User-Specific Policies

These policies restrict access to user-specific data, like profile information:

```sql
CREATE POLICY "profiles_view_policy"
ON public.profiles
FOR SELECT
USING (
  ("userId" = auth.uid())
  OR
  (company_id = get_user_company_id())
  OR
  is_superadmin()
);

CREATE POLICY "profiles_update_own_policy"
ON public.profiles
FOR UPDATE
USING (
  "userId" = auth.uid()
  OR
  is_superadmin()
);
```

### 3. Role-Based Policies

These policies add additional restrictions based on user roles:

```sql
CREATE POLICY "profiles_admin_management_policy"
ON public.profiles
FOR ALL
USING (
  (company_id = get_user_company_id() AND is_admin_or_superadmin())
  OR
  is_superadmin()
);
```

### 4. Related Table Policies

For tables that don't have a direct `company_id` but are related to other tables that do, we use subqueries:

```sql
CREATE POLICY "pos_order_items_policy"
ON public.pos_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pos_orders
    WHERE pos_orders.id = pos_order_items.order_id
    AND (
      pos_orders.company_id = get_user_company_id()
      OR
      is_superadmin()
    )
  )
);
```

## Tables with RLS

The following tables have RLS enabled:

1. **Company Data Tables**:
   - `companies`
   - `profiles`
   - `company_join_requests`

2. **Core Business Tables**:
   - `tables`
   - `table_sessions`
   - `table_maintenance`
   - `table_reservations`
   - `table_activity_log`

3. **Inventory Tables**:
   - `inventory_categories`
   - `inventory_items`
   - `inventory_transactions`

4. **POS Tables**:
   - `pos_orders`
   - `pos_order_items`

5. **Finance Tables**:
   - `finance_categories`
   - `finance_transactions`
   - `finance_reports`

## Testing RLS Policies

We've created a test script in `supabase/functions/test-rls-policies.sql` that:

1. Creates test data (companies, users, inventory items)
2. Tests various access scenarios for different user roles
3. Validates that policies are working as expected

To run the tests:

```sh
# Connect to your Supabase database
psql [connection-string]

# Run the test script
\i supabase/functions/test-rls-policies.sql
```

## Debugging RLS Issues

If you encounter unexpected access issues, you can use the `check_rls_policies()` function to list all RLS policies in the database:

```sql
SELECT * FROM check_rls_policies();
```

You can also test queries in the context of different users:

```sql
-- Set the authenticated user to test with
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Run your query
SELECT * FROM table_name;

-- Reset the user context
RESET request.jwt.claim.sub;
```

## Best Practices

1. **Always use RLS**: Never bypass RLS by using the service role client unless absolutely necessary
2. **Test thoroughly**: Verify access with different user roles
3. **Keep policies simple**: Use helper functions to make policies readable
4. **Audit regularly**: Review RLS policies as the application evolves
5. **Document changes**: Update this document when changing policies 