-- Migration 014: Extend LP Contacts with passport fields
-- Add structured dropdown fields for investor profile, accreditation, tax status, and KYC

-- Add investor type enum
ALTER TABLE lp_contacts ADD COLUMN investor_type TEXT CHECK (
    investor_type IS NULL OR investor_type IN (
        'individual',
        'institution',
        'family_office',
        'fund_of_funds',
        'endowment',
        'pension',
        'sovereign_wealth'
    )
);

-- Add accreditation status enum
ALTER TABLE lp_contacts ADD COLUMN accreditation_status TEXT CHECK (
    accreditation_status IS NULL OR accreditation_status IN (
        'accredited_investor',
        'qualified_purchaser',
        'qualified_client',
        'non_accredited'
    )
);

-- Add tax status enum
ALTER TABLE lp_contacts ADD COLUMN tax_status TEXT CHECK (
    tax_status IS NULL OR tax_status IN (
        'us_individual',
        'us_entity',
        'foreign_individual',
        'foreign_entity',
        'tax_exempt'
    )
);

-- Add KYC status enum
ALTER TABLE lp_contacts ADD COLUMN kyc_status TEXT DEFAULT 'not_started' CHECK (
    kyc_status IN (
        'not_started',
        'pending',
        'in_review',
        'approved',
        'expired',
        'rejected'
    )
);

-- Create indexes for filtering by status
CREATE INDEX idx_lp_contacts_investor_type ON lp_contacts(organization_id, investor_type);
CREATE INDEX idx_lp_contacts_accreditation ON lp_contacts(organization_id, accreditation_status);
CREATE INDEX idx_lp_contacts_kyc ON lp_contacts(organization_id, kyc_status);
