-- Migration 015: Create LP Documents table
-- Store LP subscription agreements, KYC documents, tax forms, etc.

CREATE TABLE lp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lp_contact_id UUID NOT NULL REFERENCES lp_contacts(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (
        document_type IN (
            'subscription_agreement',
            'accreditation_letter',
            'tax_form_w9',
            'tax_form_w8',
            'id_passport',
            'kyc_documents',
            'other'
        )
    ),
    document_name TEXT NOT NULL,
    file_path TEXT, -- Storage path in Supabase Storage or external URL
    status TEXT DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'uploaded',
            'under_review',
            'approved',
            'rejected',
            'expired'
        )
    ),
    expiration_date DATE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_lp_documents_updated_at
    BEFORE UPDATE ON lp_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_lp_documents_lp ON lp_documents(lp_contact_id);
CREATE INDEX idx_lp_documents_type ON lp_documents(lp_contact_id, document_type);
CREATE INDEX idx_lp_documents_status ON lp_documents(lp_contact_id, status);
CREATE INDEX idx_lp_documents_expiration ON lp_documents(expiration_date) WHERE expiration_date IS NOT NULL;
