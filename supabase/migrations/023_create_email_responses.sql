-- Migration: Create email_responses table for tracking AI-generated email replies
-- Created: 2024

-- Create email_responses table
CREATE TABLE IF NOT EXISTS email_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    original_email_id UUID NOT NULL REFERENCES emails_raw(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    ai_generated_response TEXT NOT NULL,
    final_response TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES auth.users(id),
    gmail_message_id TEXT,
    gmail_thread_id TEXT,
    tone_used TEXT,
    deal_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_responses_organization_id ON email_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_original_email_id ON email_responses(original_email_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_sent_by ON email_responses(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_responses_sent_at ON email_responses(sent_at) WHERE sent_at IS NOT NULL;

-- Enable RLS
ALTER TABLE email_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_responses
-- Users can view responses from their organization
CREATE POLICY "Users can view organization email responses"
    ON email_responses FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can insert responses for their organization
CREATE POLICY "Users can insert organization email responses"
    ON email_responses FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can update responses from their organization
CREATE POLICY "Users can update organization email responses"
    ON email_responses FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can delete responses from their organization
CREATE POLICY "Users can delete organization email responses"
    ON email_responses FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );
