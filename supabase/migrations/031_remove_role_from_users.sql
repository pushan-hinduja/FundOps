-- Migration 031: Remove role from users table
-- Role now lives exclusively in user_organizations (per-org role).
-- The helper function get_user_role() returns the role for the current user's active org.

-- Create helper function to get current user's role from junction table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT uo.role
    FROM user_organizations uo
    JOIN users u ON u.id = auth.uid() AND u.organization_id = uo.organization_id
    WHERE uo.user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Update RLS policies on user_organizations that referenced users.role
DROP POLICY IF EXISTS "Admins can insert org memberships" ON user_organizations;
DROP POLICY IF EXISTS "Admins can delete org memberships" ON user_organizations;
DROP POLICY IF EXISTS "Admins can update org memberships" ON user_organizations;

CREATE POLICY "Admins can insert org memberships"
    ON user_organizations FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

CREATE POLICY "Admins can delete org memberships"
    ON user_organizations FOR DELETE
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

CREATE POLICY "Admins can update org memberships"
    ON user_organizations FOR UPDATE
    TO authenticated
    USING (
        organization_id = get_user_organization_id()
        AND get_user_role() = 'admin'
    );

-- Drop the role column from users
ALTER TABLE users DROP COLUMN IF EXISTS role;
