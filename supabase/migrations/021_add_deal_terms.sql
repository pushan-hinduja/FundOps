-- Add deal terms to deals table
ALTER TABLE deals
  ADD COLUMN fee_percent DECIMAL(5,2),
  ADD COLUMN carry_percent DECIMAL(5,2);

-- Add special deal terms to lp_contacts table
ALTER TABLE lp_contacts
  ADD COLUMN special_fee_percent DECIMAL(5,2),
  ADD COLUMN special_carry_percent DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN deals.fee_percent IS 'Management fee percentage for the deal';
COMMENT ON COLUMN deals.carry_percent IS 'Carried interest percentage for the deal';
COMMENT ON COLUMN lp_contacts.special_fee_percent IS 'Special management fee percentage that overrides deal terms';
COMMENT ON COLUMN lp_contacts.special_carry_percent IS 'Special carried interest percentage that overrides deal terms';
