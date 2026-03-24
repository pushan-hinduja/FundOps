-- Migration 039: NDA support
-- Adds per-deal NDA document storage and per-user acceptance tracking

-- 1. Add nda_document_url column to deals
ALTER TABLE deals ADD COLUMN nda_document_url TEXT;

-- 2. Create deal_nda_acceptances table
CREATE TABLE deal_nda_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    UNIQUE(deal_id, user_id)
);

CREATE INDEX idx_deal_nda_acceptances_deal ON deal_nda_acceptances(deal_id);
CREATE INDEX idx_deal_nda_acceptances_user ON deal_nda_acceptances(user_id);

-- 3. RLS policies
ALTER TABLE deal_nda_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own NDA acceptances"
    ON deal_nda_acceptances FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view all NDA acceptances for their org deals"
    ON deal_nda_acceptances FOR SELECT TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert their own NDA acceptances"
    ON deal_nda_acceptances FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 4. Create storage bucket for NDA documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('nda-documents', 'nda-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: org members can upload and read NDA documents
CREATE POLICY "Org members can upload NDA documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'nda-documents'
        AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Org members can read NDA documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'nda-documents'
        AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM users WHERE id = auth.uid()
        )
    );
