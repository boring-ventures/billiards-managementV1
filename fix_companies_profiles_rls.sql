-- Fix the remaining tables that need RLS enabled

-- 1. Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for companies
-- For companies, we want superadmins to see all companies, other users only see their own
CREATE POLICY "Users can access their own company"
ON companies
FOR ALL
USING (
  (id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 3. Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create policy for profiles
-- Create a policy that allows:
-- - Users to see and edit their own profile
-- - Users to see profiles from their company
-- - Superadmins to see all profiles
CREATE POLICY "Users can view profiles from their company"
ON profiles
FOR SELECT
USING (
  ("userId" = auth.uid())
  OR
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 5. Policy for users to update only their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (
  "userId" = auth.uid()
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 6. Policy for admins to insert profiles into their company
CREATE POLICY "Admins can insert profiles into their company"
ON profiles
FOR INSERT
WITH CHECK (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid() AND role IN ('ADMIN', 'SUPERADMIN')))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 7. Policy for admins to delete profiles from their company
CREATE POLICY "Admins can delete profiles from their company"
ON profiles
FOR DELETE
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid() AND role IN ('ADMIN', 'SUPERADMIN')))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
); 