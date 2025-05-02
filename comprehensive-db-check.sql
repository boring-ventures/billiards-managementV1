-- 1. Check ALL tables that have company-related columns
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    column_name LIKE '%company%'
ORDER BY 
    table_name, column_name;

-- 2. Check ALL views in the public schema to find SECURITY DEFINER issues
SELECT 
    schemaname, 
    viewname, 
    definition
FROM 
    pg_views 
WHERE 
    schemaname = 'public';

-- 3. Check actual profile data structure (masked for security)
SELECT 
    id,
    SUBSTRING("userId" FOR 8) || '...' AS userId_masked,
    CASE WHEN company_id IS NOT NULL THEN SUBSTRING(company_id FOR 8) || '...' ELSE NULL END AS company_id_masked,
    CASE WHEN "companyId" IS NOT NULL THEN SUBSTRING("companyId" FOR 8) || '...' ELSE NULL END AS companyId_masked,
    role,
    active
FROM 
    profiles
LIMIT 5;

-- 4. Check User Roles distribution
SELECT 
    role, 
    COUNT(*) 
FROM 
    profiles 
GROUP BY 
    role;

-- 5. Check ALL tables in the database
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' AND 
    table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- 6. Check for Row Level Security policies
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
    schemaname = 'public'
ORDER BY
    tablename, policyname; 