-- Add caption field to task_photos table
-- This allows users to add descriptive captions to their photos

ALTER TABLE task_photos 
ADD COLUMN IF NOT EXISTS caption TEXT;

-- Add index for caption searches if needed in the future
CREATE INDEX IF NOT EXISTS idx_task_photos_caption ON task_photos(caption) WHERE caption IS NOT NULL;
