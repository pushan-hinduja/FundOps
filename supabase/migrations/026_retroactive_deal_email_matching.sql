-- When a new deal is created, retroactively match emails that mentioned
-- the deal name or company name but couldn't match at parse time.
-- Updating detected_deal_id fires the existing deal_lp_relationship trigger.

CREATE OR REPLACE FUNCTION match_emails_to_new_deal()
RETURNS TRIGGER AS $$
BEGIN
  -- Find emails_parsed records where:
  -- 1. No deal was matched (detected_deal_id IS NULL)
  -- 2. The AI detected a deal name that matches the new deal's name or company name
  -- 3. The email belongs to the same organization
  -- 4. The parse was successful
  UPDATE emails_parsed
  SET detected_deal_id = NEW.id
  WHERE detected_deal_id IS NULL
    AND processing_status = 'success'
    AND email_id IN (
      SELECT id FROM emails_raw WHERE organization_id = NEW.organization_id
    )
    AND (
      -- Match on AI-detected deal name (case-insensitive)
      (
        entities->'deal'->>'name' IS NOT NULL
        AND (
          LOWER(entities->'deal'->>'name') = LOWER(NEW.name)
          OR LOWER(entities->'deal'->>'name') = LOWER(NEW.company_name)
          -- Also match partial: detected name contains deal name or vice versa
          OR LOWER(entities->'deal'->>'name') LIKE '%' || LOWER(NEW.name) || '%'
          OR LOWER(NEW.name) LIKE '%' || LOWER(entities->'deal'->>'name') || '%'
          -- Match against company name if provided
          OR (
            NEW.company_name IS NOT NULL
            AND (
              LOWER(entities->'deal'->>'name') LIKE '%' || LOWER(NEW.company_name) || '%'
              OR LOWER(NEW.company_name) LIKE '%' || LOWER(entities->'deal'->>'name') || '%'
            )
          )
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_emails_on_deal_creation
  AFTER INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION match_emails_to_new_deal();
