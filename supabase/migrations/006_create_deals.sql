-- Migration 006: Deals table
-- Deal/SPV tracking

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    description TEXT,
    target_raise DECIMAL(15,2),
    min_check_size DECIMAL(15,2),
    max_check_size DECIMAL(15,2),
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
    total_committed DECIMAL(15,2) DEFAULT 0,
    total_interested DECIMAL(15,2) DEFAULT 0,
    memo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_deals_organization ON deals(organization_id);
CREATE INDEX idx_deals_status ON deals(organization_id, status);
CREATE INDEX idx_deals_name ON deals(organization_id, name);
