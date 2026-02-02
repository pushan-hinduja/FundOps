-- Add parsing method tracking to distinguish between simple regex and AI parsing
ALTER TABLE emails_parsed
  ADD COLUMN parsing_method TEXT DEFAULT 'simple'
  CHECK (parsing_method IN ('simple', 'ai', 'manual'));

-- Add extracted questions field
ALTER TABLE emails_parsed
  ADD COLUMN extracted_questions TEXT[];

-- Index for efficient backfill queries
CREATE INDEX idx_emails_parsed_method_status
  ON emails_parsed(parsing_method, processing_status);

-- Function to auto-create deal-LP relationships when AI parsing detects both
CREATE OR REPLACE FUNCTION create_deal_lp_relationship_from_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if both deal and LP are detected with success status
  IF NEW.detected_deal_id IS NOT NULL
     AND NEW.detected_lp_id IS NOT NULL
     AND NEW.processing_status = 'success' THEN

    -- Insert or update relationship
    INSERT INTO deal_lp_relationships (
      deal_id,
      lp_contact_id,
      status,
      committed_amount,
      latest_response_at,
      first_contact_at
    )
    VALUES (
      NEW.detected_deal_id,
      NEW.detected_lp_id,
      CASE
        WHEN NEW.intent = 'committed' THEN 'committed'::TEXT
        WHEN NEW.intent = 'interested' THEN 'interested'::TEXT
        WHEN NEW.intent = 'declined' THEN 'declined'::TEXT
        ELSE 'contacted'::TEXT
      END,
      NEW.commitment_amount,
      (SELECT received_at FROM emails_raw WHERE id = NEW.email_id),
      (SELECT received_at FROM emails_raw WHERE id = NEW.email_id)
    )
    ON CONFLICT (deal_id, lp_contact_id)
    DO UPDATE SET
      status = CASE
        -- Committed status takes precedence
        WHEN EXCLUDED.status = 'committed' THEN 'committed'::TEXT
        WHEN deal_lp_relationships.status = 'committed' THEN deal_lp_relationships.status
        -- Interested is next priority
        WHEN EXCLUDED.status = 'interested' THEN 'interested'::TEXT
        -- Otherwise keep existing status
        ELSE deal_lp_relationships.status
      END,
      committed_amount = COALESCE(EXCLUDED.committed_amount, deal_lp_relationships.committed_amount),
      latest_response_at = EXCLUDED.latest_response_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after email parsing
CREATE TRIGGER auto_create_deal_lp_relationship
  AFTER INSERT OR UPDATE ON emails_parsed
  FOR EACH ROW
  EXECUTE FUNCTION create_deal_lp_relationship_from_email();
