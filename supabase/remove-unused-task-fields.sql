-- Migration: Remove unused fields from tasks table
-- This migration removes 'description' and 'audio_url' fields that are not used in the application

-- Step 1: Drop the columns
ALTER TABLE tasks 
DROP COLUMN IF EXISTS description;

ALTER TABLE tasks 
DROP COLUMN IF EXISTS audio_url;
