-- First, check if we have a companyId vs company_id issue
SELECT 
    'companyId exists' AS check_result
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    table_name = 'profiles' AND 
    column_name = 'companyId'
UNION ALL
SELECT 
    'company_id exists' AS check_result
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    table_name = 'profiles' AND 
    column_name = 'company_id';

-- OPTION 1: If only company_id exists, add companyId as a view
-- This maintains compatibility without changing the database structure
-- Run this if ONLY 'company_id exists' shows up in the previous query

DO $$
BEGIN
    -- Check if only company_id exists and companyId doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'companyId'
    ) THEN
        -- Add a view that exposes company_id as companyId
        EXECUTE '
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS "companyId" TEXT GENERATED ALWAYS AS (company_id) STORED;
        ';
        
        RAISE NOTICE 'Added companyId as a computed column based on company_id';
    ELSE
        RAISE NOTICE 'No need to add companyId column or both columns already exist';
    END IF;
END
$$;

-- OPTION 2: If only companyId exists, add company_id
-- Run this if ONLY 'companyId exists' shows up in the previous query

DO $$
BEGIN
    -- Check if only companyId exists and company_id doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'companyId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id'
    ) THEN
        -- Add a view that exposes companyId as company_id
        EXECUTE '
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS company_id TEXT GENERATED ALWAYS AS ("companyId") STORED;
        ';
        
        RAISE NOTICE 'Added company_id as a computed column based on companyId';
    ELSE
        RAISE NOTICE 'No need to add company_id column or both columns already exist';
    END IF;
END
$$;

-- OPTION 3: If neither exists, create company_id and make it consistent

DO $$
BEGIN
    -- Check if neither column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'companyId'
    ) THEN
        -- Add the standard column company_id
        EXECUTE '
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS company_id TEXT;
            
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS "companyId" TEXT GENERATED ALWAYS AS (company_id) STORED;
        ';
        
        RAISE NOTICE 'Added both company_id and companyId columns';
    ELSE
        RAISE NOTICE 'At least one of the columns already exists';
    END IF;
END
$$; 