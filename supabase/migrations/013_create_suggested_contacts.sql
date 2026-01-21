-- Migration 013: Suggested Contacts table
-- Contacts detected from emails that haven't been added to LP table yet

CREATE TABLE suggested_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    firm TEXT,
    title TEXT,
    phone TEXT,
    source_email_id UUID REFERENCES emails_raw(id) ON DELETE CASCADE,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_suggested_contacts_updated_at
    BEFORE UPDATE ON suggested_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_suggested_contacts_org ON suggested_contacts(organization_id);
CREATE INDEX idx_suggested_contacts_email ON suggested_contacts(email);
CREATE INDEX idx_suggested_contacts_dismissed ON suggested_contacts(organization_id, is_dismissed) WHERE is_dismissed = false;

