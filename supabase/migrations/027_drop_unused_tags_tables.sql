-- Remove unused tags and email_tags tables.
-- All email categorization is handled by dedicated columns on emails_parsed:
--   intent, sentiment, extracted_questions, has_wire_details

-- Drop email_tags first (references tags)
DROP TABLE IF EXISTS email_tags;

-- Drop tags
DROP TABLE IF EXISTS tags;
