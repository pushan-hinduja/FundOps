-- Migration 042: Create organization_invites table
-- Tracks pending invitations for users who don't yet have FundOps accounts.
-- When an admin invites an email that isn't registered, we create an invite record
-- and send a Supabase invite email. The auth callback processes pending invites
-- on signup, auto-joining the user to the organization.

CREATE TABLE organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'partner', 'ops', 'member')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'canceled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_organization_invites_email ON organization_invites(email);
CREATE INDEX idx_organization_invites_org_id ON organization_invites(organization_id);

-- Enable RLS (all operations go through service client)
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
