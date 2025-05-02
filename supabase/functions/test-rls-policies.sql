-- Test RLS Policies
-- This script tests the Row Level Security policies we implemented

-- Create test function to mock different user contexts
CREATE OR REPLACE FUNCTION test_as_user(
  p_user_id UUID,
  p_query TEXT
) RETURNS SETOF RECORD AS $$
DECLARE
  result RECORD;
BEGIN
  -- Set session context to mock authenticated user
  PERFORM set_config('request.jwt.claim.sub', p_user_id::TEXT, FALSE);
  
  -- Execute the query in this user context
  FOR result IN EXECUTE p_query LOOP
    RETURN NEXT result;
  END LOOP;
  
  -- Reset session context
  PERFORM set_config('request.jwt.claim.sub', NULL, FALSE);
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to log test results
CREATE OR REPLACE FUNCTION log_test_result(
  test_name TEXT,
  passed BOOLEAN,
  details TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  RAISE NOTICE '% - %: %', 
    CASE WHEN passed THEN 'PASSED' ELSE 'FAILED' END,
    test_name,
    COALESCE(details, '');
END;
$$ LANGUAGE plpgsql;

-- Begin test transaction
BEGIN;

-- Create test data
-- Create test companies
INSERT INTO companies (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Company 1'),
  ('22222222-2222-2222-2222-222222222222', 'Test Company 2');

-- Create test users
INSERT INTO profiles (id, "userId", company_id, first_name, last_name, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   '11111111-1111-1111-1111-111111111111', 'Regular', 'User', 'USER'),
  
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
   '11111111-1111-1111-1111-111111111111', 'Admin', 'User', 'ADMIN'),
  
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 
   NULL, 'Super', 'Admin', 'SUPERADMIN'),
   
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 
   '22222222-2222-2222-2222-222222222222', 'Other', 'Company', 'USER');

-- Create test inventory items
INSERT INTO inventory_items (id, company_id, name, quantity) VALUES
  ('eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Test Item 1', 10),
  ('fffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'Test Item 2', 20);

-- Test 1: Regular user can only see their own company's data
DO $$
DECLARE
  company1_count INTEGER;
  company2_count INTEGER;
BEGIN
  -- Test as regular user from company 1
  SELECT COUNT(*) INTO company1_count FROM test_as_user(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'SELECT * FROM inventory_items'
  ) AS (id UUID, company_id UUID, category_id UUID, name TEXT, sku TEXT, 
       quantity INTEGER, critical_threshold INTEGER, price DECIMAL, 
       created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ);
  
  -- Test access to company 2 data (should be 0)
  SELECT COUNT(*) INTO company2_count FROM test_as_user(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'SELECT * FROM inventory_items WHERE company_id = ''22222222-2222-2222-2222-222222222222'''
  ) AS (id UUID, company_id UUID, category_id UUID, name TEXT, sku TEXT, 
       quantity INTEGER, critical_threshold INTEGER, price DECIMAL, 
       created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ);
  
  -- Log results
  PERFORM log_test_result(
    'Regular user company data access', 
    company1_count = 1 AND company2_count = 0,
    'Expected 1 item from own company, 0 from other company. Got ' || 
    company1_count || ' and ' || company2_count
  );
END;
$$;

-- Test 2: Superadmin can see all company data
DO $$
DECLARE
  all_companies_count INTEGER;
BEGIN
  -- Test as superadmin
  SELECT COUNT(*) INTO all_companies_count FROM test_as_user(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'SELECT * FROM companies'
  ) AS (id UUID, name TEXT, address TEXT, phone TEXT, created_at TIMESTAMPTZ);
  
  -- Log results
  PERFORM log_test_result(
    'Superadmin all companies access', 
    all_companies_count = 2,
    'Expected 2 companies, got ' || all_companies_count
  );
END;
$$;

-- Test 3: Admin can update their own company
DO $$
DECLARE
  update_success BOOLEAN;
BEGIN
  -- Try to update company as admin
  BEGIN
    PERFORM test_as_user(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'UPDATE companies SET name = ''Updated Company 1'' WHERE id = ''11111111-1111-1111-1111-111111111111'' RETURNING id'
    ) AS (id UUID);
    update_success := TRUE;
  EXCEPTION WHEN OTHERS THEN
    update_success := FALSE;
  END;
  
  -- Log results
  PERFORM log_test_result(
    'Admin update own company', 
    update_success,
    'Admin should be able to update their own company'
  );
END;
$$;

-- Test 4: Regular user cannot update company
DO $$
DECLARE
  update_success BOOLEAN;
BEGIN
  -- Try to update company as regular user (should fail)
  BEGIN
    PERFORM test_as_user(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'UPDATE companies SET name = ''Hacked Company'' WHERE id = ''11111111-1111-1111-1111-111111111111'' RETURNING id'
    ) AS (id UUID);
    update_success := TRUE;
  EXCEPTION WHEN OTHERS THEN
    update_success := FALSE;
  END;
  
  -- Log results
  PERFORM log_test_result(
    'Regular user cannot update company', 
    NOT update_success,
    'Regular user should not be able to update company settings'
  );
END;
$$;

-- Test 5: User can only see profiles from their company
DO $$
DECLARE
  own_company_profiles INTEGER;
  other_company_profiles INTEGER;
BEGIN
  -- Test seeing own company profiles
  SELECT COUNT(*) INTO own_company_profiles FROM test_as_user(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'SELECT * FROM profiles WHERE company_id = ''11111111-1111-1111-1111-111111111111'''
  ) AS (id UUID, userId UUID, company_id UUID, avatar_url TEXT, first_name TEXT, 
       last_name TEXT, role TEXT, active BOOLEAN, created_at TIMESTAMPTZ, 
       updated_at TIMESTAMPTZ);
  
  -- Test seeing other company profiles (should be 0)
  SELECT COUNT(*) INTO other_company_profiles FROM test_as_user(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'SELECT * FROM profiles WHERE company_id = ''22222222-2222-2222-2222-222222222222'''
  ) AS (id UUID, userId UUID, company_id UUID, avatar_url TEXT, first_name TEXT, 
       last_name TEXT, role TEXT, active BOOLEAN, created_at TIMESTAMPTZ, 
       updated_at TIMESTAMPTZ);
  
  -- Log results
  PERFORM log_test_result(
    'User company profiles access', 
    own_company_profiles = 2 AND other_company_profiles = 0,
    'Expected 2 profiles from own company, 0 from other company. Got ' || 
    own_company_profiles || ' and ' || other_company_profiles
  );
END;
$$;

-- Finish tests
ROLLBACK; 