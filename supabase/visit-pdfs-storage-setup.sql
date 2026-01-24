-- Storage setup for visit PDFs
-- NOTE: Storage policies MUST be created via the Supabase Dashboard UI, not SQL Editor
-- SQL Editor does not have permissions to modify storage.objects table

-- SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
--    - Name: visit-pdfs
--    - Public bucket: YES (to allow public URL access)
--    - File size limit: 50MB (or as needed)
--    - Allowed MIME types: text/html (for HTML documents)
-- 3. Click "Create bucket"
-- 4. Go to Storage → Policies tab
-- 5. For the "visit-pdfs" bucket, create the following policies:

-- POLICY 1: Allow INSERT (upload)
-- Name: "Allow anon and authenticated to upload visit PDFs"
-- Allowed operation: INSERT
-- Target roles: anon, authenticated
-- WITH CHECK expression: bucket_id = 'visit-pdfs'

-- POLICY 2: Allow SELECT (read)
-- Name: "Allow anon and authenticated to read visit PDFs"
-- Allowed operation: SELECT
-- Target roles: anon, authenticated
-- USING expression: bucket_id = 'visit-pdfs'

-- POLICY 3: Allow UPDATE
-- Name: "Allow anon and authenticated to update visit PDFs"
-- Allowed operation: UPDATE
-- Target roles: anon, authenticated
-- USING expression: bucket_id = 'visit-pdfs'
-- WITH CHECK expression: bucket_id = 'visit-pdfs'

-- POLICY 4: Allow DELETE
-- Name: "Allow anon and authenticated to delete visit PDFs"
-- Allowed operation: DELETE
-- Target roles: anon, authenticated
-- USING expression: bucket_id = 'visit-pdfs'
