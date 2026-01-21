-- Storage bucket setup for task photos
-- Run this in Supabase SQL Editor after creating the bucket in the Storage UI

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We don't need to (and can't) alter it directly

-- Step 1: Drop any existing policies for task-photos bucket (cleanup)
DROP POLICY IF EXISTS "Allow users to upload task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete task photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to task photos" ON storage.objects;

-- Step 3: Create policies for task-photos bucket
-- These policies allow both anonymous and authenticated users to upload, read, and delete photos
-- This matches the database RLS policies which allow both anon and authenticated access

-- Allow anonymous and authenticated users to upload photos
CREATE POLICY "Allow users to upload task photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'task-photos');

-- Allow anonymous and authenticated users to read photos
CREATE POLICY "Allow users to read task photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'task-photos');

-- Allow anonymous and authenticated users to update their photos
CREATE POLICY "Allow users to update task photos"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'task-photos')
WITH CHECK (bucket_id = 'task-photos');

-- Allow anonymous and authenticated users to delete their photos
CREATE POLICY "Allow users to delete task photos"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'task-photos');
