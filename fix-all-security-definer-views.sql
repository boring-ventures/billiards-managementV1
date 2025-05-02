-- First, identify all views with SECURITY DEFINER
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid) as view_definition
FROM 
    pg_class c
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
WHERE 
    c.relkind = 'v' 
    AND n.nspname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_depend d
        JOIN pg_catalog.pg_proc p ON d.refobjid = p.oid
        WHERE d.objid = c.oid 
        AND p.prosecdef = true
    );

-- FIX SCRIPT: Convert all security definer views to security invoker
-- Run the block below after checking which views need to be fixed

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all views in public schema
    FOR r IN (
        SELECT 
            c.relname as view_name, 
            pg_get_viewdef(c.oid) as view_definition
        FROM 
            pg_class c
        JOIN 
            pg_namespace n ON n.oid = c.relnamespace
        WHERE 
            c.relkind = 'v' 
            AND n.nspname = 'public'
            AND EXISTS (
                SELECT 1 FROM pg_catalog.pg_depend d
                JOIN pg_catalog.pg_proc p ON d.refobjid = p.oid
                WHERE d.objid = c.oid 
                AND p.prosecdef = true
            )
    ) LOOP
        -- Recreate each view with SECURITY INVOKER
        EXECUTE format('
            CREATE OR REPLACE VIEW public.%I
            SECURITY INVOKER
            AS %s
        ', r.view_name, r.view_definition);
        
        RAISE NOTICE 'Fixed view: %', r.view_name;
    END LOOP;
END
$$;

-- Add Row Level Security policies for superadmins on all tables
-- Run this for each table that needs superadmin access

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all tables in the public schema
    FOR r IN (
        SELECT 
            table_name
        FROM 
            information_schema.tables
        WHERE 
            table_schema = 'public'
            AND table_type = 'BASE TABLE'
            -- Skip tables that don't need RLS policies
            AND table_name NOT IN ('migrations', 'schema_migrations')
    ) LOOP
        -- Check if RLS is enabled on the table
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = r.table_name
            AND rowsecurity = true
        ) THEN
            -- Create a superadmin policy if it doesn't exist already
            BEGIN
                EXECUTE format('
                    CREATE POLICY "Superadmins can access all %1$I" ON public.%1$I
                    FOR ALL
                    TO authenticated
                    USING (
                        (SELECT p.role FROM public.profiles p WHERE p."userId" = auth.uid()) = ''SUPERADMIN''
                    );
                ', r.table_name);
                
                RAISE NOTICE 'Added superadmin policy to table: %', r.table_name;
            EXCEPTION WHEN OTHERS THEN
                -- Policy might already exist, just log and continue
                RAISE NOTICE 'Could not add policy to table: % (% - %)', r.table_name, SQLSTATE, SQLERRM;
            END;
        END IF;
    END LOOP;
END
$$;

-- Drop and recreate ALL Security Definer views with proper user filtering

-- 1. Drop existing views if they exist
DROP VIEW IF EXISTS inventory_items_with_company;
DROP VIEW IF EXISTS categories_with_company;
DROP VIEW IF EXISTS inventory_with_company;

-- 2. Recreate the views with proper filters for superadmin

-- This view shows inventory items with company information
CREATE OR REPLACE VIEW inventory_items_with_company AS
SELECT 
    ii.*,
    i.company_id
FROM 
    inventory_items ii
JOIN 
    inventory i ON ii.inventory_id = i.id;

-- This view shows categories with company information
CREATE OR REPLACE VIEW categories_with_company AS
SELECT 
    c.*,
    i.company_id
FROM 
    categories c
JOIN 
    inventory i ON c.inventory_id = i.id;

-- This view shows inventory with proper filtering
CREATE OR REPLACE VIEW inventory_with_company AS
SELECT 
    i.*
FROM 
    inventory i;

-- 3. Update RLS policies for these views to properly handle superadmin
DROP POLICY IF EXISTS "Users can view their own company inventory items" ON inventory_items_with_company;
DROP POLICY IF EXISTS "Users can view their own company categories" ON categories_with_company;
DROP POLICY IF EXISTS "Users can view their own company inventory" ON inventory_with_company;

-- Enable RLS on the views
ALTER VIEW inventory_items_with_company OWNER TO postgres;
ALTER VIEW categories_with_company OWNER TO postgres;
ALTER VIEW inventory_with_company OWNER TO postgres;

ALTER TABLE inventory_items_with_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_with_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_with_company ENABLE ROW LEVEL SECURITY;

-- Create new policies that properly handle superadmin
CREATE POLICY "Users can view their own company inventory items" ON inventory_items_with_company
    USING (
        (
            -- Allow if company_id matches user's company_id
            company_id IN (
                SELECT p.company_id FROM profiles p 
                WHERE p."userId" = auth.uid() AND p.active = true
            )
            OR
            -- Allow superadmins to see all
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p."userId" = auth.uid() AND p.role = 'superadmin' AND p.active = true
            )
        )
    );

CREATE POLICY "Users can view their own company categories" ON categories_with_company
    USING (
        (
            -- Allow if company_id matches user's company_id
            company_id IN (
                SELECT p.company_id FROM profiles p 
                WHERE p."userId" = auth.uid() AND p.active = true
            )
            OR
            -- Allow superadmins to see all
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p."userId" = auth.uid() AND p.role = 'superadmin' AND p.active = true
            )
        )
    );

CREATE POLICY "Users can view their own company inventory" ON inventory_with_company
    USING (
        (
            -- Allow if company_id matches user's company_id
            company_id IN (
                SELECT p.company_id FROM profiles p 
                WHERE p."userId" = auth.uid() AND p.active = true
            )
            OR
            -- Allow superadmins to see all
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p."userId" = auth.uid() AND p.role = 'superadmin' AND p.active = true
            )
        )
    ); 