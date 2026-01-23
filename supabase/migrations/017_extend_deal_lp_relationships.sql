-- Migration 017: Extend Deal-LP Relationships with terms and allocation tracking
-- Add deal-specific terms (fees, carry, rights) and wire/allocation tracking

-- Deal-specific terms
ALTER TABLE deal_lp_relationships ADD COLUMN management_fee_percent DECIMAL(5,2);
ALTER TABLE deal_lp_relationships ADD COLUMN carry_percent DECIMAL(5,2);
ALTER TABLE deal_lp_relationships ADD COLUMN minimum_commitment DECIMAL(15,2);
ALTER TABLE deal_lp_relationships ADD COLUMN side_letter_terms TEXT;
ALTER TABLE deal_lp_relationships ADD COLUMN has_mfn_rights BOOLEAN DEFAULT FALSE;
ALTER TABLE deal_lp_relationships ADD COLUMN has_coinvest_rights BOOLEAN DEFAULT FALSE;

-- Reporting frequency enum
ALTER TABLE deal_lp_relationships ADD COLUMN reporting_frequency TEXT CHECK (
    reporting_frequency IS NULL OR reporting_frequency IN (
        'monthly',
        'quarterly',
        'annual'
    )
);

-- Allocation tracking
ALTER TABLE deal_lp_relationships ADD COLUMN reserved_amount DECIMAL(15,2); -- Soft commitment from email

-- Wire status tracking
ALTER TABLE deal_lp_relationships ADD COLUMN wire_status TEXT DEFAULT 'pending' CHECK (
    wire_status IN (
        'pending',
        'partial',
        'complete'
    )
);
ALTER TABLE deal_lp_relationships ADD COLUMN wire_amount_received DECIMAL(15,2) DEFAULT 0;
ALTER TABLE deal_lp_relationships ADD COLUMN wire_received_at TIMESTAMPTZ;
ALTER TABLE deal_lp_relationships ADD COLUMN close_date DATE;

-- Indexes for allocation queries
CREATE INDEX idx_deal_lp_wire_status ON deal_lp_relationships(deal_id, wire_status);
CREATE INDEX idx_deal_lp_close_date ON deal_lp_relationships(deal_id, close_date) WHERE close_date IS NOT NULL;
