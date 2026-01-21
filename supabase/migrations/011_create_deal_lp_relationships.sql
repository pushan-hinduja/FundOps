-- Migration 011: Deal-LP Relationships table
-- Track LP participation in deals

CREATE TABLE deal_lp_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    lp_contact_id UUID NOT NULL REFERENCES lp_contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'contacted' CHECK (status IN ('contacted', 'interested', 'committed', 'allocated', 'declined')),
    committed_amount DECIMAL(15,2),
    allocated_amount DECIMAL(15,2),
    first_contact_at TIMESTAMPTZ,
    latest_response_at TIMESTAMPTZ,
    response_time_hours FLOAT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, lp_contact_id)
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_deal_lp_relationships_updated_at
    BEFORE UPDATE ON deal_lp_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_deal_lp_relationships_deal ON deal_lp_relationships(deal_id);
CREATE INDEX idx_deal_lp_relationships_lp ON deal_lp_relationships(lp_contact_id);
CREATE INDEX idx_deal_lp_relationships_status ON deal_lp_relationships(deal_id, status);
