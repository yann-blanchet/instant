-- Migration: Add type column to tasks table
-- This migration adds the 'type' field ('photo' | 'text') to existing tasks

-- Step 1: Add the type column (nullable first, then we'll update and make it NOT NULL)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Step 2: Update existing tasks based on their content
-- Tasks with photos (non-empty photo_ids) -> type = 'photo'
UPDATE tasks 
SET type = 'photo'
WHERE type IS NULL 
  AND photo_ids IS NOT NULL 
  AND jsonb_array_length(photo_ids) > 0;

-- Tasks with observations (non-empty observations) -> type = 'text'
UPDATE tasks 
SET type = 'text'
WHERE type IS NULL 
  AND observations IS NOT NULL 
  AND jsonb_array_length(observations) > 0;

-- Tasks with both photos and observations -> prioritize 'text' (or you can change to 'photo')
UPDATE tasks 
SET type = 'text'
WHERE type IS NULL 
  AND photo_ids IS NOT NULL 
  AND jsonb_array_length(photo_ids) > 0
  AND observations IS NOT NULL 
  AND jsonb_array_length(observations) > 0;

-- Tasks with neither -> default to 'text'
UPDATE tasks 
SET type = 'text'
WHERE type IS NULL;

-- Step 3: Add NOT NULL constraint and CHECK constraint
ALTER TABLE tasks 
ALTER COLUMN type SET NOT NULL;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_type_check CHECK (type IN ('photo', 'text'));

-- Step 4: Add comment for documentation
COMMENT ON COLUMN tasks.type IS 'Task type: photo for photo-based tasks, text for observation-based tasks';
