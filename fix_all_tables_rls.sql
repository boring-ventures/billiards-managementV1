-- Apply RLS to all tables in the application

-- 1. First make sure the is_superadmin function exists
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT role = 'SUPERADMIN'
  FROM profiles
  WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. FINANCE TABLES

-- Enable RLS on finance_categories
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for finance_categories
CREATE POLICY "Users can access their company finance categories"
ON finance_categories
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- Enable RLS on finance_transactions
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for finance_transactions
CREATE POLICY "Users can access their company finance transactions"
ON finance_transactions
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- 3. POS TABLES

-- Enable RLS on pos_orders
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for pos_orders
CREATE POLICY "Users can access their company POS orders"
ON pos_orders
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- Enable RLS on pos_order_items
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for pos_order_items
CREATE POLICY "Users can access their company POS order items"
ON pos_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM pos_orders
    WHERE pos_orders.id = pos_order_items.order_id
    AND (
      pos_orders.company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid())
      OR
      (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
    )
  )
);

-- 4. TABLE TABLES

-- Enable RLS on tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create policy for tables
CREATE POLICY "Users can access their company tables"
ON tables
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- Enable RLS on table_sessions
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for table_sessions
CREATE POLICY "Users can access their company table sessions"
ON table_sessions
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- Enable RLS on table_maintenance
ALTER TABLE public.table_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policy for table_maintenance
CREATE POLICY "Users can access their company table maintenance"
ON table_maintenance
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- Enable RLS on table_reservations
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- Create policy for table_reservations
CREATE POLICY "Users can access their company table reservations"
ON table_reservations
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
);

-- Enable RLS on table_activity_log
ALTER TABLE public.table_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policy for table_activity_log
CREATE POLICY "Users can access their company table activity logs"
ON table_activity_log
FOR ALL
USING (
  (company_id = (SELECT company_id FROM profiles WHERE "userId" = auth.uid()))
  OR
  (SELECT role = 'SUPERADMIN' FROM profiles WHERE "userId" = auth.uid())
); 