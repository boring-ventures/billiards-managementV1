-- Script to fix SECURITY DEFINER views by converting them to SECURITY INVOKER
-- This ensures that views run with the permissions of the querying user, not the view creator
-- which is important for proper Row Level Security policy enforcement

-- 1. Finance Daily Sales View
ALTER VIEW public.finance_daily_sales SET (security_barrier = true, security_invoker = true);

-- 2. Finance Monthly Revenue View 
ALTER VIEW public.finance_monthly_revenue SET (security_barrier = true, security_invoker = true);

-- Note: security_barrier=true adds an additional security layer preventing optimization 
-- from pushing potentially security-sensitive conditions into the view

-- Alternative approach if the above doesn't work
-- (Some PostgreSQL versions might require recreating the views)

-- For finance_daily_sales
/*
CREATE OR REPLACE VIEW public.finance_daily_sales
SECURITY INVOKER
AS
  -- Original view definition goes here
  -- You'll need to copy the existing view definition
;
*/

-- For finance_monthly_revenue
/*
CREATE OR REPLACE VIEW public.finance_monthly_revenue
SECURITY INVOKER
AS
  -- Original view definition goes here
  -- You'll need to copy the existing view definition
;
*/

-- Additional tips for Supabase Row Level Security:
-- 1. Make sure RLS is enabled on all tables with sensitive data
-- 2. Create appropriate policies allowing superadmins to access all data
-- 3. Example policy for superadmin access:
/*
CREATE POLICY "Superadmins can access all data" ON public.your_table
FOR ALL
TO authenticated
USING (
  (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()) = 'SUPERADMIN'
);
*/ 