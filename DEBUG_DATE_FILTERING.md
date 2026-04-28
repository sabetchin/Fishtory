# Debug Date Filtering - Supabase SQL Queries

## Test Data Exists
```sql
SELECT COUNT(*) FROM reports;
SELECT id, created_at, species FROM reports ORDER BY created_at DESC LIMIT 10;
```

## Test Date Range (Replace dates)
```sql
SELECT COUNT(*) FROM reports
WHERE created_at >= '2024-04-01' 
  AND created_at <= '2024-04-27T23:59:59.999Z';
```

## Check RLS Policies
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'reports';
SELECT * FROM pg_policies WHERE tablename = 'reports';
```

## Test Without Timezone
```sql
SELECT COUNT(*) FROM reports
WHERE created_at::date >= '2024-04-01'::date
  AND created_at::date <= '2024-04-27'::date;
```

## Temporarily Disable RLS (Testing Only)
```sql
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
-- Test query
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
```
