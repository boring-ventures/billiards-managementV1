-- Create admin audit logs table for security logging
-- This table stores a record of all operations performed using the service role client

-- Safely create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add a reference to profiles table (nullable in case the user is deleted later)
  CONSTRAINT fk_admin_audit_logs_profiles
    FOREIGN KEY (performed_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL
);

-- Add indexes for faster querying
CREATE INDEX IF NOT EXISTS admin_audit_logs_operation_idx ON admin_audit_logs(operation);
CREATE INDEX IF NOT EXISTS admin_audit_logs_performed_by_idx ON admin_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS admin_audit_logs_timestamp_idx ON admin_audit_logs(timestamp);

-- Create RLS policies for the audit logs table
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service_role clients to insert records
CREATE POLICY "Service Role can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only superadmins can read audit logs
CREATE POLICY "Only superadmins can read audit logs"
  ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT "userId" FROM profiles WHERE role = 'SUPERADMIN'
    )
  );

-- No one can update or delete audit logs (for security compliance)
CREATE POLICY "No updates allowed for audit logs"
  ON admin_audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes allowed for audit logs"
  ON admin_audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- Add a comment to the table
COMMENT ON TABLE admin_audit_logs IS 'Audit logs for security-sensitive operations performed with service_role privileges'; 