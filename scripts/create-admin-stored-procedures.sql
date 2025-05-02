-- Create stored procedures for admin operations
-- These procedures support cross-company data operations

-- Create function to get user counts by company
CREATE OR REPLACE FUNCTION get_user_counts_by_company()
RETURNS TABLE (
  "companyId" UUID,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    profiles.company_id as "companyId",
    COUNT(profiles.id) as count
  FROM profiles
  WHERE profiles.company_id IS NOT NULL
  GROUP BY profiles.company_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_counts_by_company() TO authenticated;

-- Create function to get user stats by company and role
CREATE OR REPLACE FUNCTION get_user_stats_by_company_role()
RETURNS TABLE (
  "companyId" UUID,
  role TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    profiles.company_id as "companyId",
    profiles.role as role,
    COUNT(profiles.id) as count
  FROM profiles
  WHERE profiles.company_id IS NOT NULL
  GROUP BY profiles.company_id, profiles.role;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_stats_by_company_role() TO authenticated;

-- Create function to get all admin operations logs
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  operation TEXT,
  details JSONB,
  "performedBy" UUID,
  "performedByEmail" TEXT,
  "performedByName" TEXT,
  "created_at" TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.operation,
    al.details,
    al.performed_by as "performedBy",
    users.email as "performedByEmail",
    CONCAT(p.first_name, ' ', p.last_name) as "performedByName",
    al.timestamp as "created_at"
  FROM admin_audit_logs al
  LEFT JOIN auth.users ON al.performed_by = users.id
  LEFT JOIN profiles p ON users.id = p.user_id
  ORDER BY al.timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_audit_logs(INTEGER, INTEGER) TO authenticated;

-- Comment on procedures
COMMENT ON FUNCTION get_user_counts_by_company() IS 'Get count of users per company';
COMMENT ON FUNCTION get_user_stats_by_company_role() IS 'Get count of users per company broken down by role';
COMMENT ON FUNCTION get_admin_audit_logs(INTEGER, INTEGER) IS 'Get admin audit logs with performer information'; 