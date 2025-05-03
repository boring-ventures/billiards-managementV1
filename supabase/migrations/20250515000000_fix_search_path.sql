-- Migration: Fix search_path for database functions
-- This migration updates all database functions to explicitly set the search_path parameter
-- to ensure predictable behavior regardless of session settings

-- 1. Update the RLS helper functions
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('ADMIN', 'SUPERADMIN')
  FROM profiles
  WHERE "userId" = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id::UUID
  FROM profiles
  WHERE "userId" = auth.uid();
$$;

-- 2. Update the admin stored procedures

-- Update get_user_counts_by_company function
CREATE OR REPLACE FUNCTION public.get_user_counts_by_company()
RETURNS TABLE (
  "companyId" UUID,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    profiles.company_id as "companyId",
    COUNT(profiles.id) as count
  FROM profiles
  WHERE profiles.company_id IS NOT NULL
  GROUP BY profiles.company_id;
END;
$$;

-- Update get_user_stats_by_company_role function
CREATE OR REPLACE FUNCTION public.get_user_stats_by_company_role()
RETURNS TABLE (
  "companyId" UUID,
  role TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    profiles.company_id as "companyId",
    profiles.role as role,
    COUNT(profiles.id) as count
  FROM profiles
  WHERE profiles.company_id IS NOT NULL
  GROUP BY profiles.company_id, profiles.role;
END;
$$;

-- Update get_admin_audit_logs function
CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  operation TEXT,
  details JSONB,
  "performedBy" UUID,
  "performedByEmail" TEXT,
  "performedByName" TEXT,
  "created_at" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.operation,
    al.details,
    al.performed_by as "performedBy",
    users.email as "performedByEmail",
    CONCAT(p.first_name, ' ', p.last_name) as "performedByName",
    al.timestamp as "created_at"
  FROM admin_audit_logs al
  LEFT JOIN auth.users ON al.performed_by = users.id
  LEFT JOIN profiles p ON users.id = p.user_id
  ORDER BY al.timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Re-grant permissions to ensure they persist after function updates
GRANT EXECUTE ON FUNCTION public.get_user_counts_by_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats_by_company_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(INTEGER, INTEGER) TO authenticated; 