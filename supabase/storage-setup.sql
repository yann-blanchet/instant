-- Storage bucket setup for task photos
-- Run this in Supabase SQL Editor after creating the bucket in the Storage UI

-- Create a storage bucket for task photos (if not already created via UI)
-- Note: Buckets are typically created via the Supabase Dashboard > Storage
-- This is just for reference - you'll need to create it manually in the UI

-- Storage bucket policies
-- These policies allow authenticated users to upload, read, and delete their own photos

-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload task photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-photos' AND
  (storage.foldername(name))[1] = 'task-photos'
);

-- Allow authenticated users to read photos
CREATE POLICY "Allow authenticated users to read task photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-photos');

-- Allow authenticated users to update their photos
CREATE POLICY "Allow authenticated users to update task photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'task-photos')
WITH CHECK (bucket_id = 'task-photos');

-- Allow authenticated users to delete their photos
CREATE POLICY "Allow authenticated users to delete task photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-photos');

-- For public access (if you want photos to be publicly accessible without auth)
-- Uncomment the following policies and comment out the authenticated ones above

-- CREATE POLICY "Allow public read access to task photos"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'task-photos');

-- CREATE POLICY "Allow authenticated users to upload task photos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'task-photos');

-- CREATE POLICY "Allow authenticated users to delete task photos"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'task-photos');
