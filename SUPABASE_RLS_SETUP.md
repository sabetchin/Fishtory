# Supabase RLS Policy Setup for Fisherman Registry

## Step 1: Check Current RLS Status

```sql
-- Check if RLS is enabled on fishermen_profiles
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'fishermen_profiles';

-- View existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'fishermen_profiles';
```

## Step 2: Enable RLS (if not already enabled)

```sql
ALTER TABLE fishermen_profiles ENABLE ROW LEVEL SECURITY;
```

## Step 3: Create RLS Policies for Admin Access

### Option A: Allow All Authenticated Users (Simple)

```sql
-- Allow all authenticated users to read fishermen profiles
CREATE POLICY "Enable read access for all authenticated users"
ON fishermen_profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert
CREATE POLICY "Enable insert for all authenticated users"
ON fishermen_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Enable update for own profile"
ON fishermen_profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Enable delete for own profile"
ON fishermen_profiles
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);
```

### Option B: Admin-Only Access (Recommended for Admin Panel)

```sql
-- First, create an admin role if it doesn't exist
-- This requires service_role key to execute

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all fishermen profiles"
ON fishermen_profiles
FOR SELECT
TO authenticated
USING (
  -- Check if user has admin role in user_profiles table
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

-- Allow admins to insert profiles
CREATE POLICY "Admins can insert fishermen profiles"
ON fishermen_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

-- Allow admins to update any profile
CREATE POLICY "Admins can update any fishermen profile"
ON fishermen_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete any fishermen profile"
ON fishermen_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);
```

### Option C: Fisherman Can Read/Update Own Profile

```sql
-- Fishermen can read their own profile
CREATE POLICY "Fishermen can read own profile"
ON fishermen_profiles
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Fishermen can update their own profile
CREATE POLICY "Fishermen can update own profile"
ON fishermen_profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
```

## Step 4: Drop Existing Policies (if needed)

```sql
-- Drop a specific policy
DROP POLICY IF EXISTS "policy_name" ON fishermen_profiles;

-- Drop all policies on the table
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable delete for own profile" ON fishermen_profiles;
```

## Step 5: Disable RLS for Testing (Development Only)

⚠️ **WARNING**: Only use this in development environment!

```sql
ALTER TABLE fishermen_profiles DISABLE ROW LEVEL SECURITY;
```

## Step 6: Re-enable RLS After Testing

```sql
ALTER TABLE fishermen_profiles ENABLE ROW LEVEL SECURITY;
```

## Step 7: Verify Policies Work

```sql
-- Test as current user
SELECT * FROM fishermen_profiles LIMIT 1;

-- Check current user info
SELECT auth.uid(), current_user;
```

## Quick Fix: Allow Public Access (Not Recommended for Production)

```sql
-- Allow anyone to read (bypasses RLS)
CREATE POLICY "Public read access"
ON fishermen_profiles
FOR SELECT
TO public
USING (true);
```

## Recommended Policy Set for Production

```sql
-- Drop all existing policies first
DROP POLICY IF EXISTS "Public read access" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON fishermen_profiles;
DROP POLICY IF EXISTS "Enable delete for own profile" ON fishermen_profiles;

-- Admin policies
CREATE POLICY "Admins can read all fishermen profiles"
ON fishermen_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert fishermen profiles"
ON fishermen_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update any fishermen profile"
ON fishermen_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete any fishermen profile"
ON fishermen_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid()::text 
    AND user_profiles.role = 'admin'
  )
);

-- Fisherman policies
CREATE POLICY "Fishermen can read own profile"
ON fishermen_profiles
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Fishermen can update own profile"
ON fishermen_profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
```
