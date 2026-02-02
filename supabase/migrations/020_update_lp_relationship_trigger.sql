-- Update the trigger function to auto-create LPs when detecting interested/committed emails
CREATE OR REPLACE FUNCTION create_deal_lp_relationship_from_email()
RETURNS TRIGGER AS $$
DECLARE
  v_lp_id UUID;
  v_email_from TEXT;
  v_email_from_name TEXT;
  v_organization_id UUID;
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

      -- If no LP found and we have interest/commitment, create one
      IF v_lp_id IS NULL AND NEW.intent IN ('interested', 'committed') THEN
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

        -- Update the emails_parsed record with the new LP ID
        UPDATE emails_parsed
        SET detected_lp_id = v_lp_id
        WHERE id = NEW.id;
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

-- Also backfill any existing parsed emails that have deals but no relationships
DO $$
DECLARE
  r RECORD;
  v_lp_id UUID;
BEGIN
  FOR r IN
    SELECT ep.*, er.from_email, er.from_name, er.organization_id, er.received_at
    FROM emails_parsed ep
    JOIN emails_raw er ON er.id = ep.email_id
    WHERE ep.detected_deal_id IS NOT NULL
      AND ep.processing_status = 'success'
      AND ep.intent IN ('interested', 'committed')
      AND ep.commitment_amount IS NOT NULL
      AND ep.commitment_amount > 0
  LOOP
    -- Try to find existing LP
    SELECT id INTO v_lp_id
    FROM lp_contacts
    WHERE organization_id = r.organization_id
      AND LOWER(email) = LOWER(r.from_email)
    LIMIT 1;

    -- Create LP if not found
    IF v_lp_id IS NULL THEN
      INSERT INTO lp_contacts (organization_id, name, email)
      VALUES (
        r.organization_id,
        COALESCE(r.from_name, SPLIT_PART(r.from_email, '@', 1)),
        r.from_email
      )
      ON CONFLICT (organization_id, email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_lp_id;
    END IF;

    -- Create relationship
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
        r.detected_deal_id,
        v_lp_id,
        CASE
          WHEN r.intent = 'committed' THEN 'committed'
          WHEN r.intent = 'interested' THEN 'interested'
          ELSE 'contacted'
        END,
        r.commitment_amount,
        r.received_at,
        r.received_at
      )
      ON CONFLICT (deal_id, lp_contact_id)
      DO UPDATE SET
        committed_amount = COALESCE(EXCLUDED.committed_amount, deal_lp_relationships.committed_amount);

      -- Update emails_parsed with LP ID
      UPDATE emails_parsed SET detected_lp_id = v_lp_id WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
