-- Add is_answered column to track whether a question has been responded to
ALTER TABLE emails_parsed
ADD COLUMN is_answered BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient dashboard queries (unanswered questions)
CREATE INDEX idx_emails_parsed_unanswered_questions
ON emails_parsed (intent, is_answered)
WHERE intent = 'question' AND is_answered = FALSE;

-- Backfill: mark questions as answered if they already have an email_response
UPDATE emails_parsed ep
SET is_answered = TRUE
FROM email_responses er
WHERE er.original_email_id = ep.email_id
  AND ep.intent = 'question';
