-- Migration 016: Create LP Wiring Instructions table
-- Store LP bank account and wiring details for capital calls

CREATE TABLE lp_wiring_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lp_contact_id UUID NOT NULL REFERENCES lp_contacts(id) ON DELETE CASCADE,
    account_label TEXT NOT NULL, -- e.g., "Primary Account", "Investment Account"
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL, -- Encrypted/masked in application layer
    routing_number TEXT, -- US domestic wires
    swift_code TEXT, -- International wires
    iban TEXT, -- European accounts
    bank_address TEXT,
    intermediary_bank TEXT, -- For international transfers
    special_instructions TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_lp_wiring_instructions_updated_at
    BEFORE UPDATE ON lp_wiring_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_lp_wiring_lp ON lp_wiring_instructions(lp_contact_id);
CREATE INDEX idx_lp_wiring_primary ON lp_wiring_instructions(lp_contact_id, is_primary) WHERE is_primary = TRUE;

-- Ensure only one primary account per LP
CREATE UNIQUE INDEX idx_lp_wiring_single_primary ON lp_wiring_instructions(lp_contact_id) WHERE is_primary = TRUE;
