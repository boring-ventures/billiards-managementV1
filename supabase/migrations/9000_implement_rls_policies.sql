-- Implement Row Level Security (RLS) policies for all tables
-- This migration enables RLS and creates appropriate policies for each table

-- PART 1: Create or update helper functions
DROP FUNCTION IF EXISTS public.is_superadmin();
CREATE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.is_admin_or_superadmin();
CREATE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('ADMIN', 'SUPERADMIN')
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.get_user_company_id();
CREATE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id::UUID
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- PART 2: Enable RLS and create policies for tables

-- 1. COMPANY-SCOPED TABLES
-- These tables contain company_id and should be scoped to the user's company

-- Tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tables_company_access_policy" ON public.tables;
CREATE POLICY "tables_company_access_policy" 
ON public.tables
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Table Sessions
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "table_sessions_company_access_policy" ON public.table_sessions;
CREATE POLICY "table_sessions_company_access_policy" 
ON public.table_sessions
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Table Maintenance
ALTER TABLE public.table_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "table_maintenance_company_access_policy" ON public.table_maintenance;
CREATE POLICY "table_maintenance_company_access_policy" 
ON public.table_maintenance
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Table Reservations
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "table_reservations_company_access_policy" ON public.table_reservations;
CREATE POLICY "table_reservations_company_access_policy" 
ON public.table_reservations
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Table Activity Log
ALTER TABLE public.table_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "table_activity_log_company_access_policy" ON public.table_activity_log;
CREATE POLICY "table_activity_log_company_access_policy" 
ON public.table_activity_log
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Inventory Categories
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_categories_company_access_policy" ON public.inventory_categories;
CREATE POLICY "inventory_categories_company_access_policy" 
ON public.inventory_categories
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Inventory Items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_items_company_access_policy" ON public.inventory_items;
CREATE POLICY "inventory_items_company_access_policy" 
ON public.inventory_items
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Inventory Transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_transactions_company_access_policy" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_company_access_policy" 
ON public.inventory_transactions
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- POS Orders
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_orders_company_access_policy" ON public.pos_orders;
CREATE POLICY "pos_orders_company_access_policy" 
ON public.pos_orders
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Finance Categories
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_categories_company_access_policy" ON public.finance_categories;
CREATE POLICY "finance_categories_company_access_policy" 
ON public.finance_categories
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- Finance Transactions
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_transactions_company_access_policy" ON public.finance_transactions;
CREATE POLICY "finance_transactions_company_access_policy" 
ON public.finance_transactions
FOR ALL
USING (
  (company_id = public.get_user_company_id())
  OR 
  public.is_superadmin()
);

-- 2. USER-SPECIFIC RLS POLICIES

-- Profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for viewing profiles
DROP POLICY IF EXISTS "profiles_view_policy" ON public.profiles;
CREATE POLICY "profiles_view_policy"
ON public.profiles
FOR SELECT
USING (
  ("userId" = auth.uid())
  OR
  (company_id = public.get_user_company_id())
  OR
  public.is_superadmin()
);

-- Policy for updating own profile
DROP POLICY IF EXISTS "profiles_update_own_policy" ON public.profiles;
CREATE POLICY "profiles_update_own_policy"
ON public.profiles
FOR UPDATE
USING (
  "userId" = auth.uid()
  OR
  public.is_superadmin()
);

-- Policy for admins to manage profiles in their company
DROP POLICY IF EXISTS "profiles_admin_management_policy" ON public.profiles;
CREATE POLICY "profiles_admin_management_policy"
ON public.profiles
FOR ALL
USING (
  (company_id = public.get_user_company_id() AND public.is_admin_or_superadmin())
  OR
  public.is_superadmin()
);

-- 3. COMPANY JOIN REQUESTS

-- Check if CompanyJoinRequest table exists and apply policies
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_join_requests'
  ) THEN
    -- CompanyJoinRequest table
    ALTER TABLE public.company_join_requests ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "join_requests_view_own_policy" ON public.company_join_requests;
    DROP POLICY IF EXISTS "join_requests_insert_policy" ON public.company_join_requests;
    DROP POLICY IF EXISTS "join_requests_admin_view_policy" ON public.company_join_requests;
    DROP POLICY IF EXISTS "join_requests_admin_update_policy" ON public.company_join_requests;

    -- Users can see their own join requests
    CREATE POLICY "join_requests_view_own_policy"
    ON public.company_join_requests
    FOR SELECT
    USING (
      user_id = auth.uid()
    );

    -- Users can create their own join requests
    CREATE POLICY "join_requests_insert_policy"
    ON public.company_join_requests
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
    );

    -- Admins can see join requests for their company
    CREATE POLICY "join_requests_admin_view_policy"
    ON public.company_join_requests
    FOR SELECT
    USING (
      (company_id = public.get_user_company_id() AND public.is_admin_or_superadmin())
      OR
      public.is_superadmin()
    );

    -- Admins can update join requests for their company
    CREATE POLICY "join_requests_admin_update_policy"
    ON public.company_join_requests
    FOR UPDATE
    USING (
      (company_id = public.get_user_company_id() AND public.is_admin_or_superadmin())
      OR
      public.is_superadmin()
    );
  END IF;
END $$;

-- 4. COMPANIES TABLE

-- Companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Users can view their own company 
DROP POLICY IF EXISTS "companies_view_own_policy" ON public.companies;
CREATE POLICY "companies_view_own_policy"
ON public.companies
FOR SELECT
USING (
  (id = public.get_user_company_id())
  OR
  public.is_superadmin()
);

-- Admin users can update their own company
DROP POLICY IF EXISTS "companies_update_own_policy" ON public.companies;
CREATE POLICY "companies_update_own_policy"
ON public.companies
FOR UPDATE
USING (
  (id = public.get_user_company_id() AND public.is_admin_or_superadmin())
  OR
  public.is_superadmin()
);

-- Superadmins can manage all companies
DROP POLICY IF EXISTS "companies_superadmin_policy" ON public.companies;
CREATE POLICY "companies_superadmin_policy"
ON public.companies
FOR ALL
USING (
  public.is_superadmin()
);

-- 5. SPECIAL CASES FOR RELATED TABLES

-- POS Order Items
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;

-- Users can access POS order items related to their company orders
DROP POLICY IF EXISTS "pos_order_items_policy" ON public.pos_order_items;
CREATE POLICY "pos_order_items_policy"
ON public.pos_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pos_orders
    WHERE pos_orders.id = pos_order_items.order_id
    AND (
      pos_orders.company_id = public.get_user_company_id()
      OR
      public.is_superadmin()
    )
  )
);

-- 6. FINANCE REPORTS
 
DO $$
DECLARE
  column_exists boolean;
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'finance_reports'
  ) THEN
    -- Check which column exists for user identification
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'finance_reports' 
      AND column_name = 'profile_id'
    ) INTO column_exists;
    
    -- Enable RLS on the table
    ALTER TABLE public.finance_reports ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "finance_reports_policy" ON public.finance_reports;
    
    -- Create appropriate policy based on column name
    IF column_exists THEN
      -- Use profile_id if it exists
      CREATE POLICY "finance_reports_policy"
      ON public.finance_reports
      FOR ALL
      USING (
        (profile_id = auth.uid())
        OR
        (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE finance_reports.profile_id = profiles.id
            AND profiles.company_id = public.get_user_company_id()
          )
          AND public.is_admin_or_superadmin()
        )
        OR
        public.is_superadmin()
      );
    ELSE
      -- Check if user_id exists
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'finance_reports' 
        AND column_name = 'user_id'
      ) INTO column_exists;
      
      IF column_exists THEN
        -- Use user_id if it exists
        CREATE POLICY "finance_reports_policy"
        ON public.finance_reports
        FOR ALL
        USING (
          (user_id = auth.uid())
          OR
          (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE finance_reports.user_id = profiles."userId"
              AND profiles.company_id = public.get_user_company_id()
            )
            AND public.is_admin_or_superadmin()
          )
          OR
          public.is_superadmin()
        );
      ELSE
        -- Fall back to company_id only
        CREATE POLICY "finance_reports_policy"
        ON public.finance_reports
        FOR ALL
        USING (
          (company_id = public.get_user_company_id())
          OR
          public.is_superadmin()
        );
      END IF;
    END IF;
  END IF;
END $$;

-- Add RLS validation queries to verify policies are working

-- Create or replace function to check RLS policies
CREATE OR REPLACE FUNCTION check_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  policy_type TEXT,
  roles TEXT[],
  using_expr TEXT,
  with_check_expr TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    policyname,
    cmd,
    roles,
    using_,
    with_check
  FROM
    pg_policies
  WHERE
    schemaname = 'public'
  ORDER BY
    tablename, policyname;
END;
$$ LANGUAGE plpgsql;

-- Add comment on function
COMMENT ON FUNCTION check_rls_policies() IS 'Lists all RLS policies in the public schema'; 