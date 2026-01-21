-- Migration 009: Tags table
-- Tagging taxonomy for emails

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('intent', 'topic', 'priority', 'sentiment', 'custom')),
    color TEXT DEFAULT '#6B7280', -- Tailwind gray-500
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Index for tag lookups
CREATE INDEX idx_tags_organization ON tags(organization_id);
CREATE INDEX idx_tags_type ON tags(organization_id, type);
