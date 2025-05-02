-- SQL Script to fix inventory related RLS policies

-- 1. Check if is_superadmin function exists, create it if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
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
    
    RAISE NOTICE 'Created is_superadmin() function';
  ELSE
    RAISE NOTICE 'is_superadmin() function already exists';
  END IF;
END
$$;

-- 2. Check inventory tables and their existing policies
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE '%inventory%';

-- Check existing RLS policies
SELECT tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename LIKE '%inventory%';

-- 3. Enable RLS on inventory_item table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_item') THEN
    ALTER TABLE public.inventory_item ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on inventory_item table';
  ELSE
    RAISE NOTICE 'inventory_item table not found';
  END IF;
  
  -- Check for other inventory table name patterns
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on inventory_items table';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventoryitem') THEN
    ALTER TABLE public.inventoryitem ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on inventoryitem table';
  END IF;
END
$$;

-- 4. Create/Update RLS policies for inventory_item table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_item') THEN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS inventory_item_select_policy ON public.inventory_item;
    DROP POLICY IF EXISTS inventory_item_insert_policy ON public.inventory_item;
    DROP POLICY IF EXISTS inventory_item_update_policy ON public.inventory_item;
    DROP POLICY IF EXISTS inventory_item_delete_policy ON public.inventory_item;
    
    -- Create new policies
    -- SELECT policy
    CREATE POLICY inventory_item_select_policy ON public.inventory_item
    FOR SELECT USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- INSERT policy
    CREATE POLICY inventory_item_insert_policy ON public.inventory_item
    FOR INSERT WITH CHECK (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- UPDATE policy
    CREATE POLICY inventory_item_update_policy ON public.inventory_item
    FOR UPDATE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- DELETE policy
    CREATE POLICY inventory_item_delete_policy ON public.inventory_item
    FOR DELETE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    RAISE NOTICE 'Created new RLS policies for inventory_item table';
  END IF;
END
$$;

-- 5. Create/Update RLS policies for inventory items tables with other names
DO $$
BEGIN
  -- Check for inventoryitem table (singular)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventoryitem') THEN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS inventoryitem_select_policy ON public.inventoryitem;
    DROP POLICY IF EXISTS inventoryitem_insert_policy ON public.inventoryitem;
    DROP POLICY IF EXISTS inventoryitem_update_policy ON public.inventoryitem;
    DROP POLICY IF EXISTS inventoryitem_delete_policy ON public.inventoryitem;
    
    -- Create new policies
    -- SELECT policy
    CREATE POLICY inventoryitem_select_policy ON public.inventoryitem
    FOR SELECT USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- INSERT policy
    CREATE POLICY inventoryitem_insert_policy ON public.inventoryitem
    FOR INSERT WITH CHECK (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- UPDATE policy
    CREATE POLICY inventoryitem_update_policy ON public.inventoryitem
    FOR UPDATE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- DELETE policy
    CREATE POLICY inventoryitem_delete_policy ON public.inventoryitem
    FOR DELETE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    RAISE NOTICE 'Created new RLS policies for inventoryitem table';
  END IF;
  
  -- Check for inventory_items table (plural)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS inventory_items_select_policy ON public.inventory_items;
    DROP POLICY IF EXISTS inventory_items_insert_policy ON public.inventory_items;
    DROP POLICY IF EXISTS inventory_items_update_policy ON public.inventory_items;
    DROP POLICY IF EXISTS inventory_items_delete_policy ON public.inventory_items;
    
    -- Create new policies
    -- SELECT policy
    CREATE POLICY inventory_items_select_policy ON public.inventory_items
    FOR SELECT USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- INSERT policy
    CREATE POLICY inventory_items_insert_policy ON public.inventory_items
    FOR INSERT WITH CHECK (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- UPDATE policy
    CREATE POLICY inventory_items_update_policy ON public.inventory_items
    FOR UPDATE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- DELETE policy
    CREATE POLICY inventory_items_delete_policy ON public.inventory_items
    FOR DELETE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    RAISE NOTICE 'Created new RLS policies for inventory_items table';
  END IF;
END
$$;

-- 6. Check inventory categories table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_category') THEN
    -- Enable RLS
    ALTER TABLE public.inventory_category ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if any
    DROP POLICY IF EXISTS inventory_category_select_policy ON public.inventory_category;
    DROP POLICY IF EXISTS inventory_category_insert_policy ON public.inventory_category;
    DROP POLICY IF EXISTS inventory_category_update_policy ON public.inventory_category;
    DROP POLICY IF EXISTS inventory_category_delete_policy ON public.inventory_category;
    
    -- Create new policies
    -- SELECT policy
    CREATE POLICY inventory_category_select_policy ON public.inventory_category
    FOR SELECT USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- INSERT policy
    CREATE POLICY inventory_category_insert_policy ON public.inventory_category
    FOR INSERT WITH CHECK (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- UPDATE policy
    CREATE POLICY inventory_category_update_policy ON public.inventory_category
    FOR UPDATE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- DELETE policy
    CREATE POLICY inventory_category_delete_policy ON public.inventory_category
    FOR DELETE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    RAISE NOTICE 'Created new RLS policies for inventory_category table';
  END IF;
  
  -- Check for inventorycategory table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventorycategory') THEN
    -- Enable RLS
    ALTER TABLE public.inventorycategory ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if any
    DROP POLICY IF EXISTS inventorycategory_select_policy ON public.inventorycategory;
    DROP POLICY IF EXISTS inventorycategory_insert_policy ON public.inventorycategory;
    DROP POLICY IF EXISTS inventorycategory_update_policy ON public.inventorycategory;
    DROP POLICY IF EXISTS inventorycategory_delete_policy ON public.inventorycategory;
    
    -- Create new policies with all column name variations
    -- SELECT policy
    CREATE POLICY inventorycategory_select_policy ON public.inventorycategory
    FOR SELECT USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- INSERT policy
    CREATE POLICY inventorycategory_insert_policy ON public.inventorycategory
    FOR INSERT WITH CHECK (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- UPDATE policy
    CREATE POLICY inventorycategory_update_policy ON public.inventorycategory
    FOR UPDATE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    -- DELETE policy
    CREATE POLICY inventorycategory_delete_policy ON public.inventorycategory
    FOR DELETE USING (
      (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
      OR
      (company_id = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR 
      (companyId = (SELECT companyId FROM profiles WHERE user_id = auth.uid()))
      OR
      (is_superadmin() = TRUE)
    );
    
    RAISE NOTICE 'Created new RLS policies for inventorycategory table';
  END IF;
END
$$;

-- 7. Enable RLS on all inventory tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on inventory_items table';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_categories') THEN
    ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on inventory_categories table';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
    ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on inventory_transactions table';
  END IF;
END
$$;

-- 8. Drop existing policies if any
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_items' AND policyname = 'Users can view inventory items from their company') THEN
    DROP POLICY IF EXISTS "Users can view inventory items from their company" ON inventory_items;
    RAISE NOTICE 'Dropped existing RLS policy for inventory_items table';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_categories' AND policyname = 'Users can view inventory categories from their company') THEN
    DROP POLICY IF EXISTS "Users can view inventory categories from their company" ON inventory_categories;
    RAISE NOTICE 'Dropped existing RLS policy for inventory_categories table';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_transactions' AND policyname = 'Users can view inventory transactions from their company') THEN
    DROP POLICY IF EXISTS "Users can view inventory transactions from their company" ON inventory_transactions;
    RAISE NOTICE 'Dropped existing RLS policy for inventory_transactions table';
  END IF;
END
$$;

-- 9. Create RLS policies for inventory_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    -- Create new policies
    CREATE POLICY "Users can view inventory items from their company"
    ON inventory_items
    FOR ALL
    USING (
      (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
      OR
      (public.is_superadmin() = true)
    );
    
    RAISE NOTICE 'Created new RLS policy for inventory_items table';
  END IF;
END
$$;

-- 10. Create RLS policies for inventory_categories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_categories') THEN
    -- Create new policies
    CREATE POLICY "Users can view inventory categories from their company"
    ON inventory_categories
    FOR ALL
    USING (
      (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
      OR
      (public.is_superadmin() = true)
    );
    
    RAISE NOTICE 'Created new RLS policy for inventory_categories table';
  END IF;
END
$$;

-- 11. Create RLS policies for inventory_transactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
    -- Create new policies
    CREATE POLICY "Users can view inventory transactions from their company"
    ON inventory_transactions
    FOR ALL
    USING (
      (company_id = (SELECT company_id FROM profiles WHERE profiles.userId = auth.uid()))
      OR
      (public.is_superadmin() = true)
    );
    
    RAISE NOTICE 'Created new RLS policy for inventory_transactions table';
  END IF;
END
$$; 