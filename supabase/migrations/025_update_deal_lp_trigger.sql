-- Update trigger function to:
-- 1. Auto-create LPs for 'question' intent (in addition to interested/committed)
-- 2. Clean up suggested_contacts when an LP is auto-created
CREATE OR REPLACE FUNCTION create_deal_lp_relationship_from_email()
RETURNS TRIGGER AS $$
DECLARE
  v_lp_id UUID;
  v_email_from TEXT;
  v_email_from_name TEXT;
  v_organization_id UUID;
  v_lp_was_created BOOLEAN := FALSE;
BEGIN
  -- Only proceed if deal is detected with success status
  IF NEW.detected_deal_id IS NOT NULL
     AND NEW.processing_status = 'success' THEN

    -- Get email sender info
    SELECT from_email, from_name, organization_id
    INTO v_email_from, v_email_from_name, v_organization_id
    FROM emails_raw
    WHERE id = NEW.email_id;

    -- Use detected LP if available, otherwise try to find/create one
    v_lp_id := NEW.detected_lp_id;

    IF v_lp_id IS NULL AND v_email_from IS NOT NULL THEN
      -- Try to find existing LP by email
      SELECT id INTO v_lp_id
      FROM lp_contacts
      WHERE organization_id = v_organization_id
        AND LOWER(email) = LOWER(v_email_from)
      LIMIT 1;

      -- If no LP found and sender is interacting on a deal, create one
      IF v_lp_id IS NULL AND NEW.intent IN ('interested', 'committed', 'question') THEN
        INSERT INTO lp_contacts (
          organization_id,
          name,
          email
        )
        VALUES (
          v_organization_id,
          COALESCE(v_email_from_name, SPLIT_PART(v_email_from, '@', 1)),
          v_email_from
        )
        RETURNING id INTO v_lp_id;

        v_lp_was_created := TRUE;

        -- Update the emails_parsed record with the new LP ID
        UPDATE emails_parsed
        SET detected_lp_id = v_lp_id
        WHERE id = NEW.id;

        -- Clean up suggested_contacts since this person is now a real LP
        DELETE FROM suggested_contacts
        WHERE organization_id = v_organization_id
          AND LOWER(email) = LOWER(v_email_from);
      END IF;
    END IF;

    -- Create relationship if we have an LP
    IF v_lp_id IS NOT NULL THEN
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
        v_lp_id,
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
