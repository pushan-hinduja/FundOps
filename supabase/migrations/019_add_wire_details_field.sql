-- Add has_wire_details field to emails_parsed table
ALTER TABLE emails_parsed
  ADD COLUMN has_wire_details BOOLEAN DEFAULT false;

-- Add index for wire filtering
CREATE INDEX idx_emails_parsed_wire_details
  ON emails_parsed(has_wire_details)
  WHERE has_wire_details = true;
