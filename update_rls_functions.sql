-- Update existing RLS helper functions without dropping them
-- Run this script directly in the SQL Editor of your Supabase dashboard

-- Update the superadmin check function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the admin or superadmin check function
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('ADMIN', 'SUPERADMIN')
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the user company ID function
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id::UUID
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Test that the functions are working properly
SELECT 
  'Functions updated successfully. Testing results:' AS message,
  auth.uid() AS current_user_id,
  public.is_superadmin() AS is_superadmin_result,
  public.is_admin_or_superadmin() AS is_admin_or_superadmin_result,
  public.get_user_company_id() AS company_id_result; 