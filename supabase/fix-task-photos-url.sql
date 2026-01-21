-- Fix task_photos table to allow null URLs
-- Run this in Supabase SQL Editor

ALTER TABLE task_photos ALTER COLUMN url DROP NOT NULL;
