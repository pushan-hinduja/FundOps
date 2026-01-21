-- Migration 007: Emails Raw table
-- Raw ingested emails with deduplication

CREATE TABLE emails_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    auth_account_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL, -- Gmail/Outlook message ID for deduplication
    thread_id TEXT,
    from_email TEXT NOT NULL,
    from_name TEXT,
    to_emails TEXT[] DEFAULT '{}',
    cc_emails TEXT[] DEFAULT '{}',
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMPTZ NOT NULL,
    has_attachments BOOLEAN DEFAULT false,
    raw_payload JSONB,
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, message_id)
);

-- Indexes for common queries
CREATE INDEX idx_emails_raw_org_received ON emails_raw(organization_id, received_at DESC);
CREATE INDEX idx_emails_raw_thread ON emails_raw(thread_id);
CREATE INDEX idx_emails_raw_from ON emails_raw(from_email);
CREATE INDEX idx_emails_raw_auth_account ON emails_raw(auth_account_id);
