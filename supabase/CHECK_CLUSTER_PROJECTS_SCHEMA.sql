-- Quick check to see cluster_projects table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cluster_projects'
ORDER BY ordinal_position;
