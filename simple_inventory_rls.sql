-- Simple step-by-step script to fix inventory RLS

-- 1. Create is_superadmin function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'SUPERADMIN'
    FROM profiles
    WHERE profiles.userId = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on inventory tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view inventory items from their company" ON inventory_items;
DROP POLICY IF EXISTS "Users can view inventory categories from their company" ON inventory_categories;
DROP POLICY IF EXISTS "Users can view inventory transactions from their company" ON inventory_transactions;

-- 4. Create RLS policies for inventory_items
CREATE POLICY "Users can view inventory items from their company"
ON inventory_items
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
  OR
  (public.is_superadmin() = true)
);

-- 5. Create RLS policies for inventory_categories
CREATE POLICY "Users can view inventory categories from their company"
ON inventory_categories
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
  OR
  (public.is_superadmin() = true)
);

-- 6. Create RLS policies for inventory_transactions
CREATE POLICY "Users can view inventory transactions from their company"
ON inventory_transactions
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
  OR
  (public.is_superadmin() = true)
); 