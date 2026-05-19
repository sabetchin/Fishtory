-- ============================================
-- STAFF TRACKING SYSTEM DATABASE SCHEMA
-- ============================================

-- 1. Create staff profiles table (if not exists)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update fisherman_profiles table to include staff tracking
ALTER TABLE fishermen_profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff_profiles(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS operator_address TEXT,
ADD COLUMN IF NOT EXISTS operator_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_boats_operated INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_crew INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS target_catch_common VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_catch_english VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_catch_scientific VARCHAR(255),
ADD COLUMN IF NOT EXISTS lean_months VARCHAR(100),
ADD COLUMN IF NOT EXISTS lean_daily_avg_catch DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS peak_months VARCHAR(100),
ADD COLUMN IF NOT EXISTS peak_daily_avg_catch DECIMAL(10, 2);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fisherman_profiles_created_by ON fishermen_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_staff_id ON staff_profiles(staff_id);

-- 4. Enable Row Level Security
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishermen_profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for staff_profiles
-- Staff can read their own profile
CREATE POLICY "Staff can read own profile" 
ON staff_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Admin can read all staff profiles
CREATE POLICY "Admin can read all staff profiles" 
ON staff_profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM staff_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 6. RLS Policies for fishermen_profiles (updated)
-- Staff can read profiles they created
CREATE POLICY "Staff can read own created profiles" 
ON fishermen_profiles FOR SELECT 
USING (created_by = auth.uid());

-- Admin can read all profiles
CREATE POLICY "Admin can read all profiles" 
ON fishermen_profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM staff_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Staff can insert profiles (they will be the creator)
CREATE POLICY "Staff can insert profiles" 
ON fishermen_profiles FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Staff can update profiles they created
CREATE POLICY "Staff can update own profiles" 
ON fishermen_profiles FOR UPDATE 
USING (created_by = auth.uid());

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles" 
ON fishermen_profiles FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM staff_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- INSERT STAFF ACCOUNTS (Run in Supabase SQL Editor)
-- ============================================

-- Note: You need to create these users in Supabase Auth first, then insert into staff_profiles
-- Or use the Supabase Dashboard to create users with these credentials

-- Staff 01
INSERT INTO staff_profiles (user_id, staff_id, full_name, email, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'staff01@domain.com'),
    'STAFF01',
    'Staff Member 01',
    'staff01@domain.com',
    'staff'
) ON CONFLICT (email) DO NOTHING;

-- Staff 02
INSERT INTO staff_profiles (user_id, staff_id, full_name, email, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'staff02@domain.com'),
    'STAFF02',
    'Staff Member 02',
    'staff02@domain.com',
    'staff'
) ON CONFLICT (email) DO NOTHING;

-- Staff 03
INSERT INTO staff_profiles (user_id, staff_id, full_name, email, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'staff03@domain.com'),
    'STAFF03',
    'Staff Member 03',
    'staff03@domain.com',
    'staff'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- HELPER FUNCTION TO GET STAFF PERFORMANCE
-- ============================================

CREATE OR REPLACE FUNCTION get_staff_performance()
RETURNS TABLE (
    staff_id VARCHAR(20),
    staff_name VARCHAR(255),
    email VARCHAR(255),
    profiles_gathered BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.staff_id,
        sp.full_name,
        sp.email,
        COUNT(fp.id) as profiles_gathered
    FROM staff_profiles sp
    LEFT JOIN fishermen_profiles fp ON fp.created_by = sp.user_id
    WHERE sp.role = 'staff'
    GROUP BY sp.staff_id, sp.full_name, sp.email
    ORDER BY sp.staff_id;
END;
$$ LANGUAGE plpgsql;
