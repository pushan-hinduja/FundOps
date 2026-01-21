-- Migration 005: LP Contacts table
-- Limited Partner contact database

CREATE TABLE lp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    firm TEXT,
    title TEXT,
    phone TEXT,
    preferred_check_size INTEGER, -- in USD
    avg_response_time_hours FLOAT,
    total_commitments DECIMAL(15,2) DEFAULT 0,
    participation_rate FLOAT, -- % of deals they commit to
    last_interaction_at TIMESTAMPTZ,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_lp_contacts_updated_at
    BEFORE UPDATE ON lp_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_lp_contacts_organization ON lp_contacts(organization_id);
CREATE INDEX idx_lp_contacts_email ON lp_contacts(email);
CREATE INDEX idx_lp_contacts_firm ON lp_contacts(organization_id, firm);
CREATE INDEX idx_lp_contacts_name ON lp_contacts(organization_id, name);
