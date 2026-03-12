-- Migration 030: Create user_organizations junction table
-- Allows users to belong to multiple organizations.
-- users.organization_id remains the "active" org for RLS compatibility.

CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'partner', 'ops', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_organization_id ON user_organizations(organization_id);

-- Enable RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "Users can view own memberships"
    ON user_organizations FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Inserts are done via service client (bypasses RLS) in API routes.
-- Only admins can add members to their own org.
-- No permissive insert policy for regular users — prevents users
-- from adding themselves to arbitrary organizations.

CREATE POLICY "Admins can delete org memberships"
    ON user_organizations FOR DELETE
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Admins can update org memberships"
    ON user_organizations FOR UPDATE
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Backfill existing users into the junction table
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT id, organization_id, role
FROM users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;
