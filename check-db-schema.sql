-- Check the profiles table schema to identify any column name mismatches
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    table_name = 'profiles'
ORDER BY 
    ordinal_position;

-- Check if there are any constraints that involve company_id or companyId
SELECT 
    tc.table_schema, 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    kcu.column_name LIKE '%company%' AND
    tc.table_schema = 'public';

-- Check the inventory tables schema
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    table_name LIKE '%inventory%' AND
    column_name LIKE '%company%'
ORDER BY 
    table_name, ordinal_position;

-- Check views with SECURITY DEFINER
SELECT 
    schemaname, 
    viewname, 
    definition 
FROM 
    pg_views 
WHERE 
    schemaname = 'public' AND 
    viewname IN ('finance_daily_sales', 'finance_monthly_revenue');

-- Example query to directly access the profiles table
-- Replace 'YOUR-USER-ID' with an actual user ID
/*
SELECT * FROM profiles 
WHERE userId = 'YOUR-USER-ID';
*/ 