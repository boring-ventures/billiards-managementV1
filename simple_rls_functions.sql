-- Simple functions for RLS policies
-- Run this script directly in the SQL Editor of your Supabase dashboard

-- Function to check if user is a superadmin
DROP FUNCTION IF EXISTS public.is_superadmin();
CREATE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is an admin or superadmin
DROP FUNCTION IF EXISTS public.is_admin_or_superadmin();
CREATE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('ADMIN', 'SUPERADMIN')
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get user's company ID
DROP FUNCTION IF EXISTS public.get_user_company_id();
CREATE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id::UUID
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Test command to verify functions work
SELECT 'If you see this message, the functions were created successfully'; 