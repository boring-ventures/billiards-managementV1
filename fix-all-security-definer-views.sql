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