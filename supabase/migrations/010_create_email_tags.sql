-- Migration 010: Email Tags table
-- Junction table for email-tag associations

CREATE TABLE email_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES emails_raw(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confidence FLOAT, -- 0.0 to 1.0, null for manual tags
    source TEXT NOT NULL CHECK (source IN ('ai', 'manual')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email_id, tag_id)
);

-- Indexes for common queries
CREATE INDEX idx_email_tags_email ON email_tags(email_id);
CREATE INDEX idx_email_tags_tag ON email_tags(tag_id);
