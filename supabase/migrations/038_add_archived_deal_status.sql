-- Migrate any existing cancelled deals to archived
UPDATE deals SET status = 'archived' WHERE status = 'cancelled';

-- Replace the CHECK constraint: remove 'cancelled', add 'archived'
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_status_check
  CHECK (status IN ('draft', 'active', 'closed', 'archived'));
