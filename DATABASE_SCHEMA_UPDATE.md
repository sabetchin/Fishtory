# Database Schema Update: contact_number → phone_number

## Issue
The code has been updated to use `phone_number` instead of `contact_number`, but the database column is still named `contact_number`.

## Solution: Rename Column in Supabase

Run this SQL command in your Supabase SQL Editor:

```sql
ALTER TABLE fishermen_profiles 
RENAME COLUMN contact_number TO phone_number;
```

## Verify the Change

```sql
-- Check the column was renamed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fishermen_profiles';
```

## If You Have Other Tables Using contact_number

Check if other tables also need updating:

```sql
-- Find all tables with contact_number column
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'contact_number';
```

If other tables have this column, rename them too:

```sql
-- Example for user_profiles table
ALTER TABLE user_profiles 
RENAME COLUMN contact_number TO phone_number;
```

## Full Schema Check for fishermen_profiles

```sql
-- View complete schema for fishermen_profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'fishermen_profiles'
ORDER BY ordinal_position;
```

## Expected Schema for fishermen_profiles

After the rename, your table should have these columns:
- id (uuid/integer)
- fisherman_id (text)
- last_name (text)
- first_name (text)
- boat_name (text)
- location (text)
- phone_number (text) ← renamed from contact_number
- status (text)
- created_at (timestamptz)
- user_id (text) - if linking to auth users
