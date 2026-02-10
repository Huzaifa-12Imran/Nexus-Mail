-- Check if table exists
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attachments';

-- Check RLS status
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'attachments';
