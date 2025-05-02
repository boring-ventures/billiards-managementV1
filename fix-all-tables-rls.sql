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

-- TABLES MODULE
-- Fix policies for tables and related tables
DROP POLICY IF EXISTS "Users can view tables for their company" ON tables;
DROP POLICY IF EXISTS "Users can view table sessions" ON table_sessions;
DROP POLICY IF EXISTS "Users can view table reservations" ON table_reservations;
DROP POLICY IF EXISTS "Users can view table maintenance" ON table_maintenance;
DROP POLICY IF EXISTS "Users can view table activity log" ON table_activity_log;

-- Tables table
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
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Table sessions
CREATE POLICY "Users can view table sessions" ON table_sessions
FOR SELECT
USING (
    (
        -- Regular users can only see their company's table sessions
        EXISTS (
            SELECT 1 FROM tables t
            WHERE t.id = table_sessions.table_id
            AND auth.uid() IN (
                SELECT "userId" FROM profiles
                WHERE profiles.company_id = t.company_id
                AND profiles.active = true
            )
        )
        OR
        -- Superadmins can see ALL table sessions regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Table reservations
CREATE POLICY "Users can view table reservations" ON table_reservations
FOR SELECT
USING (
    (
        -- Regular users can only see their company's table reservations
        EXISTS (
            SELECT 1 FROM tables t
            WHERE t.id = table_reservations.table_id
            AND auth.uid() IN (
                SELECT "userId" FROM profiles
                WHERE profiles.company_id = t.company_id
                AND profiles.active = true
            )
        )
        OR
        -- Superadmins can see ALL table reservations regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Table maintenance
CREATE POLICY "Users can view table maintenance" ON table_maintenance
FOR SELECT
USING (
    (
        -- Regular users can only see their company's table maintenance
        EXISTS (
            SELECT 1 FROM tables t
            WHERE t.id = table_maintenance.table_id
            AND auth.uid() IN (
                SELECT "userId" FROM profiles
                WHERE profiles.company_id = t.company_id
                AND profiles.active = true
            )
        )
        OR
        -- Superadmins can see ALL table maintenance regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Table activity log
CREATE POLICY "Users can view table activity log" ON table_activity_log
FOR SELECT
USING (
    (
        -- Regular users can only see their company's table activity log
        EXISTS (
            SELECT 1 FROM tables t
            WHERE t.id = table_activity_log.table_id
            AND auth.uid() IN (
                SELECT "userId" FROM profiles
                WHERE profiles.company_id = t.company_id
                AND profiles.active = true
            )
        )
        OR
        -- Superadmins can see ALL table activity log regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- INVENTORY MODULE
-- Fix policies for inventory tables
DROP POLICY IF EXISTS "Users can view inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can view inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Users can view inventory transactions" ON inventory_transactions;

-- Inventory items
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
        -- Superadmins can see ALL inventory items regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Inventory categories
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
        -- Superadmins can see ALL inventory categories regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Inventory transactions
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
        -- Superadmins can see ALL inventory transactions regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- POS MODULE
-- Fix policies for POS tables
DROP POLICY IF EXISTS "Users can view orders" ON pos_orders;
DROP POLICY IF EXISTS "Users can view order items" ON pos_order_items;

-- POS orders
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
        -- Superadmins can see ALL orders regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- POS order items
CREATE POLICY "Users can view order items" ON pos_order_items
FOR SELECT
USING (
    (
        -- Regular users can only see their company's order items
        EXISTS (
            SELECT 1 FROM pos_orders o
            WHERE o.id = pos_order_items.order_id
            AND auth.uid() IN (
                SELECT "userId" FROM profiles
                WHERE profiles.company_id = o.company_id
                AND profiles.active = true
            )
        )
        OR
        -- Superadmins can see ALL order items regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- FINANCE MODULE
-- Fix policies for finance tables
DROP POLICY IF EXISTS "Users can view finance reports" ON finance_reports;
DROP POLICY IF EXISTS "Users can view finance transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Users can view finance categories" ON finance_categories;

-- Finance reports
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
        -- Superadmins can see ALL finance reports regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Finance transactions
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
        -- Superadmins can see ALL finance transactions regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Finance categories
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
        -- Superadmins can see ALL finance categories regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Companies table
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
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
); 