-- Check inventory table structures
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('inventory_items', 'inventory_categories', 'inventory_transactions')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check if tables have company_id column
SELECT 
  t.table_name, 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = t.table_name 
    AND column_name = 'company_id'
    AND table_schema = 'public'
  ) THEN 'Has company_id' ELSE 'Missing company_id' END as status
FROM (
  VALUES 
    ('inventory_items'), 
    ('inventory_categories'), 
    ('inventory_transactions')
) as t(table_name);

-- Check for any potential RLS issues
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename IN ('inventory_items', 'inventory_categories', 'inventory_transactions')
ORDER BY
  tablename, policyname; 