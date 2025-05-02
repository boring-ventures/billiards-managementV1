-- First check for any other tables with similar RLS policy issues
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

-- Fix finance_reports RLS policies to correctly use userId and add superadmin cross-company access
DROP POLICY IF EXISTS "Only admins can create/edit reports" ON finance_reports;
DROP POLICY IF EXISTS "Only admins can update reports" ON finance_reports;
DROP POLICY IF EXISTS "Users can view reports for their company" ON finance_reports;

-- Create proper policies with correct userId reference and superadmin access
CREATE POLICY "Users can view reports for their company" ON finance_reports
FOR SELECT
USING (
    (
        -- Regular users can see only their company's reports
        auth.uid() IN (
            SELECT "userId" FROM profiles
            WHERE profiles.company_id = finance_reports.company_id
            AND profiles.active = true
        )
        OR
        -- Superadmins can see ALL reports regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

CREATE POLICY "Only admins can update reports" ON finance_reports
FOR UPDATE
USING (
    (
        -- Company admins can update their company's reports
        auth.uid() IN (
            SELECT "userId" FROM profiles
            WHERE profiles.company_id = finance_reports.company_id
            AND profiles.role IN ('ADMIN', 'SUPERADMIN')
            AND profiles.active = true
        )
        OR
        -- Superadmins can update ANY report regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

CREATE POLICY "Only admins can create/edit reports" ON finance_reports
FOR INSERT
WITH CHECK (
    (
        -- Company admins can create reports for their company
        auth.uid() IN (
            SELECT "userId" FROM profiles
            WHERE profiles.company_id = finance_reports.company_id
            AND profiles.role IN ('ADMIN', 'SUPERADMIN')
            AND profiles.active = true
        )
        OR
        -- Superadmins can create reports for ANY company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);

-- Template for fixing other tables with similar issues
-- Replace TABLE_NAME with the actual table name
/*
DROP POLICY IF EXISTS "Policy name" ON TABLE_NAME;

CREATE POLICY "Users can view their company data" ON TABLE_NAME
FOR SELECT
USING (
    (
        -- Regular users can only see their company's data
        auth.uid() IN (
            SELECT "userId" FROM profiles
            WHERE profiles.company_id = TABLE_NAME.company_id
            AND profiles.active = true
        )
        OR
        -- Superadmins can see ALL data regardless of company
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles."userId" = auth.uid()
            AND profiles.role = 'SUPERADMIN'
            AND profiles.active = true
        )
    )
);
*/ 