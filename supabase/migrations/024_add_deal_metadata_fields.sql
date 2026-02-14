-- Add metadata fields to deals table
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS created_date DATE,
  ADD COLUMN IF NOT EXISTS close_date DATE,
  ADD COLUMN IF NOT EXISTS investment_stage TEXT,
  ADD COLUMN IF NOT EXISTS investment_type TEXT;
