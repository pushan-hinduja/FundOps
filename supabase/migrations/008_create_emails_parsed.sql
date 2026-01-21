-- Migration 008: Emails Parsed table
-- AI-parsed email data with confidence scores

CREATE TABLE emails_parsed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES emails_raw(id) ON DELETE CASCADE,
    detected_lp_id UUID REFERENCES lp_contacts(id) ON DELETE SET NULL,
    detected_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    intent TEXT CHECK (intent IN ('interested', 'committed', 'declined', 'question', 'neutral')),
    commitment_amount DECIMAL(15,2),
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
    topics TEXT[] DEFAULT '{}',
    entities JSONB DEFAULT '{}',
    confidence_scores JSONB DEFAULT '{}', -- {lp: 0.95, deal: 0.88, intent: 0.92, amount: 0.85}
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'success', 'failed', 'manual_review')),
    error_message TEXT,
    manual_override BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    model_version TEXT,
    parsed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email_id) -- One parsed result per email (latest)
);

-- Indexes for common queries
CREATE INDEX idx_emails_parsed_lp ON emails_parsed(detected_lp_id);
CREATE INDEX idx_emails_parsed_deal ON emails_parsed(detected_deal_id);
CREATE INDEX idx_emails_parsed_intent ON emails_parsed(intent);
CREATE INDEX idx_emails_parsed_status ON emails_parsed(processing_status);
CREATE INDEX idx_emails_parsed_email ON emails_parsed(email_id);
