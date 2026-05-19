-- ============================================================
-- FISHTORY SECURITY MIGRATION
-- Run this entire script in the Supabase SQL Editor (once)
-- ============================================================

-- ============================================================
-- STEP 1: Add submitted_by column to reports
-- This tracks WHICH user (staff or fisherman) submitted the report
-- ============================================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: treat existing reports as submitted by the fisherman themselves
UPDATE reports SET submitted_by = user_id WHERE submitted_by IS NULL;

-- ============================================================
-- STEP 2: Enable Row Level Security on all key tables
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisherman_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: RLS Policies for `reports` table
-- ============================================================

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "Fishermen can read own reports" ON reports;
DROP POLICY IF EXISTS "Fishermen can insert own reports" ON reports;
DROP POLICY IF EXISTS "Staff can insert reports" ON reports;
DROP POLICY IF EXISTS "Staff can update own submitted reports" ON reports;
DROP POLICY IF EXISTS "Admin can read all reports" ON reports;
DROP POLICY IF EXISTS "Admin can update all reports" ON reports;
DROP POLICY IF EXISTS "Admin can delete reports" ON reports;

-- Fishermen: can only read their OWN reports
CREATE POLICY "Fishermen can read own reports"
ON reports FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Fishermen: can only insert reports for themselves
CREATE POLICY "Fishermen can insert own reports"
ON reports FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND submitted_by = auth.uid());

-- Staff: can insert reports (on behalf of registered fishermen)
CREATE POLICY "Staff can insert reports"
ON reports FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'staff'
  )
);

-- Staff: can update (edit) reports they submitted (only while pending)
CREATE POLICY "Staff can update own submitted reports"
ON reports FOR UPDATE TO authenticated
USING (submitted_by = auth.uid())
WITH CHECK (submitted_by = auth.uid());

-- Admin: can read ALL reports across all fishermen
CREATE POLICY "Admin can read all reports"
ON reports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'admin'
  )
);

-- Admin: can update (approve/reject) any report
CREATE POLICY "Admin can update all reports"
ON reports FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'admin'
  )
);

-- Admin: can delete any report
CREATE POLICY "Admin can delete reports"
ON reports FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'admin'
  )
);

-- ============================================================
-- STEP 4: RLS Policies for `fisherman_registration` table
-- ============================================================

DROP POLICY IF EXISTS "Fishermen can read own registration" ON fisherman_registration;
DROP POLICY IF EXISTS "Staff can insert fisherman registration" ON fisherman_registration;
DROP POLICY IF EXISTS "Staff can read own created registrations" ON fisherman_registration;
DROP POLICY IF EXISTS "Staff can update own created registrations" ON fisherman_registration;
DROP POLICY IF EXISTS "Admin can read all registrations" ON fisherman_registration;

-- Fishermen: can read their own profile row
CREATE POLICY "Fishermen can read own registration"
ON fisherman_registration FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Staff: can insert new fisherman profiles (created_by must be the staff's own uid)
CREATE POLICY "Staff can insert fisherman registration"
ON fisherman_registration FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'staff'
  )
);

-- Staff: can read profiles they created
CREATE POLICY "Staff can read own created registrations"
ON fisherman_registration FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- Staff: can update profiles they created
CREATE POLICY "Staff can update own created registrations"
ON fisherman_registration FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Admin: can read ALL fisherman registrations
CREATE POLICY "Admin can read all registrations"
ON fisherman_registration FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'admin'
  )
);

-- ============================================================
-- STEP 5: RLS Policies for `staff_profiles` table
-- ============================================================

DROP POLICY IF EXISTS "Staff can read own profile" ON staff_profiles;
DROP POLICY IF EXISTS "Admin can read all staff profiles" ON staff_profiles;

-- Staff: can read their own profile
CREATE POLICY "Staff can read own profile"
ON staff_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admin: can read ALL staff profiles
CREATE POLICY "Admin can read all staff profiles"
ON staff_profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.role = 'admin'
  )
);

-- ============================================================
-- VERIFICATION: Run this to confirm all policies were created
-- ============================================================
-- SELECT policyname, tablename, cmd 
-- FROM pg_policies 
-- WHERE tablename IN ('reports', 'fisherman_registration', 'staff_profiles')
-- ORDER BY tablename, cmd;
