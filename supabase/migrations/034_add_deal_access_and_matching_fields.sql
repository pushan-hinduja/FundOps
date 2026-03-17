-- Deal access and matching fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS access TEXT NOT NULL DEFAULT 'public' CHECK (access IN ('public', 'private'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS geography TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS investment_thesis TEXT;

-- LP manual preferences
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS preferred_sectors JSONB DEFAULT '[]';
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS preferred_stages JSONB DEFAULT '[]';
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS preferred_geographies JSONB DEFAULT '[]';

-- LP derived preferences (computed from deal history + emails)
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS derived_sectors JSONB DEFAULT '[]';
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS derived_stages JSONB DEFAULT '[]';
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS derived_geographies JSONB DEFAULT '[]';
ALTER TABLE lp_contacts ADD COLUMN IF NOT EXISTS last_deal_activity_at TIMESTAMPTZ;
