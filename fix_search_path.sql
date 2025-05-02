-- Fix the is_superadmin function with proper search path
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Set search_path explicitly to public
  PERFORM set_config('search_path', 'public', false);
  
  RETURN (
    SELECT role = 'SUPERADMIN'
    FROM profiles
    WHERE "userId" = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 