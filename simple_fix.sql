-- 1. Create is_superadmin function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Enable RLS on inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on inventory_categories  
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create policy for inventory_items
CREATE POLICY "Users can view inventory items from their company"
ON inventory_items
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 6. Create policy for inventory_categories
CREATE POLICY "Users can view inventory categories from their company"
ON inventory_categories
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 7. Create policy for inventory_transactions
CREATE POLICY "Users can view inventory transactions from their company"
ON inventory_transactions
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
); 