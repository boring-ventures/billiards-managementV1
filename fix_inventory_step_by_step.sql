-- Step 1: Create the is_superadmin function
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

-- Step 2: Enable RLS on inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Step 3: Enable RLS on inventory_categories
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- Step 4: Enable RLS on inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policy on inventory_items if it exists
DROP POLICY IF EXISTS "Users can view inventory items from their company" ON inventory_items;

-- Step 6: Create policy for inventory_items
CREATE POLICY "Users can view inventory items from their company"
ON inventory_items
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
  OR
  (public.is_superadmin() = true)
);

-- Step 7: Drop existing policy on inventory_categories if it exists
DROP POLICY IF EXISTS "Users can view inventory categories from their company" ON inventory_categories;

-- Step 8: Create policy for inventory_categories
CREATE POLICY "Users can view inventory categories from their company"
ON inventory_categories
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
  OR
  (public.is_superadmin() = true)
);

-- Step 9: Drop existing policy on inventory_transactions if it exists
DROP POLICY IF EXISTS "Users can view inventory transactions from their company" ON inventory_transactions;

-- Step 10: Create policy for inventory_transactions
CREATE POLICY "Users can view inventory transactions from their company"
ON inventory_transactions
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
  OR
  (public.is_superadmin() = true)
); 