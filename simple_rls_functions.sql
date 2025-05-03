-- Simple functions for RLS policies
-- Run this script directly in the SQL Editor of your Supabase dashboard

-- Function to check if user is a superadmin
-- Don't drop functions as they have dependencies
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN 
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$;

-- Function to check if user is an admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN 
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('ADMIN', 'SUPERADMIN')
  FROM profiles
  WHERE "userId" = auth.uid();
$$;

-- Function to get user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID 
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id::UUID
  FROM profiles
  WHERE "userId" = auth.uid();
$$;

-- Test command to verify functions work
SELECT 'If you see this message, the functions were created successfully'; 