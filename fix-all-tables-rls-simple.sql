-- First identify all tables with the problematic RLS pattern
SELECT
    schemaname,
    tablename,
    policyname
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND qual::text LIKE '%auth.uid() IN ( SELECT profiles.id%'
ORDER BY
    tablename, policyname;

-- Create a function to check if user is a superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles."userId" = auth.uid()
        AND profiles.role = 'SUPERADMIN'
        AND profiles.active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Individual policy updates with error handling
DO $$
BEGIN
    -- COMPANIES
    BEGIN
        DROP POLICY IF EXISTS "Users can view their company" ON companies;
        CREATE POLICY "Users can view their company" ON companies
        FOR SELECT
        USING (
            (
                -- Regular users can only see their own company
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = companies.id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL companies
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for companies';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for companies: % - %', SQLSTATE, SQLERRM;
    END;

    -- TABLES
    BEGIN
        DROP POLICY IF EXISTS "Users can view tables for their company" ON tables;
        CREATE POLICY "Users can view tables for their company" ON tables
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's tables
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = tables.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL tables regardless of company
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for tables';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for tables: % - %', SQLSTATE, SQLERRM;
    END;

    -- TABLE_SESSIONS
    BEGIN
        DROP POLICY IF EXISTS "Users can view table sessions" ON table_sessions;
        CREATE POLICY "Users can view table sessions" ON table_sessions
        FOR SELECT
        USING (
            (
                -- Direct access to company_id for simplicity
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = table_sessions.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL sessions
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for table_sessions';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for table_sessions: % - %', SQLSTATE, SQLERRM;
    END;

    -- TABLE_RESERVATIONS
    BEGIN
        DROP POLICY IF EXISTS "Users can view table reservations" ON table_reservations;
        CREATE POLICY "Users can view table reservations" ON table_reservations
        FOR SELECT
        USING (
            (
                -- Direct access to company_id for simplicity
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = table_reservations.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL reservations
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for table_reservations';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for table_reservations: % - %', SQLSTATE, SQLERRM;
    END;

    -- TABLE_MAINTENANCE
    BEGIN
        DROP POLICY IF EXISTS "Users can view table maintenance" ON table_maintenance;
        CREATE POLICY "Users can view table maintenance" ON table_maintenance
        FOR SELECT
        USING (
            (
                -- Direct access to company_id for simplicity
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = table_maintenance.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL maintenance
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for table_maintenance';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for table_maintenance: % - %', SQLSTATE, SQLERRM;
    END;

    -- TABLE_ACTIVITY_LOG
    BEGIN
        DROP POLICY IF EXISTS "Users can view table activity log" ON table_activity_log;
        CREATE POLICY "Users can view table activity log" ON table_activity_log
        FOR SELECT
        USING (
            (
                -- Direct access to company_id for simplicity
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = table_activity_log.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL activity logs
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for table_activity_log';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for table_activity_log: % - %', SQLSTATE, SQLERRM;
    END;

    -- INVENTORY_ITEMS
    BEGIN
        DROP POLICY IF EXISTS "Users can view inventory items" ON inventory_items;
        CREATE POLICY "Users can view inventory items" ON inventory_items
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's inventory items
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = inventory_items.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL inventory items
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for inventory_items';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for inventory_items: % - %', SQLSTATE, SQLERRM;
    END;

    -- INVENTORY_CATEGORIES
    BEGIN
        DROP POLICY IF EXISTS "Users can view inventory categories" ON inventory_categories;
        CREATE POLICY "Users can view inventory categories" ON inventory_categories
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's inventory categories
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = inventory_categories.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL inventory categories
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for inventory_categories';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for inventory_categories: % - %', SQLSTATE, SQLERRM;
    END;

    -- INVENTORY_TRANSACTIONS
    BEGIN
        DROP POLICY IF EXISTS "Users can view inventory transactions" ON inventory_transactions;
        CREATE POLICY "Users can view inventory transactions" ON inventory_transactions
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's inventory transactions
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = inventory_transactions.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL inventory transactions
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for inventory_transactions';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for inventory_transactions: % - %', SQLSTATE, SQLERRM;
    END;

    -- POS_ORDERS
    BEGIN
        DROP POLICY IF EXISTS "Users can view orders" ON pos_orders;
        CREATE POLICY "Users can view orders" ON pos_orders
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's orders
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = pos_orders.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL orders
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for pos_orders';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for pos_orders: % - %', SQLSTATE, SQLERRM;
    END;

    -- POS_ORDER_ITEMS
    BEGIN
        DROP POLICY IF EXISTS "Users can view order items" ON pos_order_items;
        CREATE POLICY "Users can view order items" ON pos_order_items
        FOR SELECT
        USING (
            (
                -- Direct access to company_id for simplicity
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = pos_order_items.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL order items
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for pos_order_items';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for pos_order_items: % - %', SQLSTATE, SQLERRM;
    END;

    -- FINANCE_REPORTS
    BEGIN
        DROP POLICY IF EXISTS "Users can view finance reports" ON finance_reports;
        CREATE POLICY "Users can view finance reports" ON finance_reports
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's finance reports
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = finance_reports.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL finance reports
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for finance_reports';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for finance_reports: % - %', SQLSTATE, SQLERRM;
    END;

    -- FINANCE_TRANSACTIONS
    BEGIN
        DROP POLICY IF EXISTS "Users can view finance transactions" ON finance_transactions;
        CREATE POLICY "Users can view finance transactions" ON finance_transactions
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's finance transactions
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = finance_transactions.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL finance transactions
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for finance_transactions';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for finance_transactions: % - %', SQLSTATE, SQLERRM;
    END;

    -- FINANCE_CATEGORIES
    BEGIN
        DROP POLICY IF EXISTS "Users can view finance categories" ON finance_categories;
        CREATE POLICY "Users can view finance categories" ON finance_categories
        FOR SELECT
        USING (
            (
                -- Regular users can only see their company's finance categories
                auth.uid() IN (
                    SELECT "userId" FROM profiles
                    WHERE profiles.company_id = finance_categories.company_id
                    AND profiles.active = true
                )
                OR
                -- Superadmins can see ALL finance categories
                is_superadmin()
            )
        );
        RAISE NOTICE 'Updated policy for finance_categories';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policy for finance_categories: % - %', SQLSTATE, SQLERRM;
    END;
END $$; 