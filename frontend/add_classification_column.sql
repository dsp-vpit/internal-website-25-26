-- Add classification field to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS classification TEXT;
