-- Migration 012: Row Level Security Policies
-- Ensure users can only access their organization's data

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_parsed ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_lp_relationships ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    TO authenticated
    USING (id = get_user_organization_id());

-- Users: Users can only see users in their organization
CREATE POLICY "Users can view org members"
    ON users FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Auth Accounts: Users can only see their own accounts
CREATE POLICY "Users can view own auth accounts"
    ON auth_accounts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own auth accounts"
    ON auth_accounts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own auth accounts"
    ON auth_accounts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own auth accounts"
    ON auth_accounts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- LP Contacts: Users can CRUD within their organization
CREATE POLICY "Users can view org LP contacts"
    ON lp_contacts FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org LP contacts"
    ON lp_contacts FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org LP contacts"
    ON lp_contacts FOR UPDATE
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org LP contacts"
    ON lp_contacts FOR DELETE
    TO authenticated
    USING (organization_id = get_user_organization_id());

-- Deals: Users can CRUD within their organization
CREATE POLICY "Users can view org deals"
    ON deals FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org deals"
    ON deals FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org deals"
    ON deals FOR UPDATE
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org deals"
    ON deals FOR DELETE
    TO authenticated
    USING (organization_id = get_user_organization_id());

-- Emails Raw: Users can view/insert within their organization
CREATE POLICY "Users can view org emails"
    ON emails_raw FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org emails"
    ON emails_raw FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = get_user_organization_id());

-- Emails Parsed: Users can view/update parsed emails in their org
CREATE POLICY "Users can view org parsed emails"
    ON emails_parsed FOR SELECT
    TO authenticated
    USING (
        email_id IN (
            SELECT id FROM emails_raw WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can insert parsed emails"
    ON emails_parsed FOR INSERT
    TO authenticated
    WITH CHECK (
        email_id IN (
            SELECT id FROM emails_raw WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can update parsed emails"
    ON emails_parsed FOR UPDATE
    TO authenticated
    USING (
        email_id IN (
            SELECT id FROM emails_raw WHERE organization_id = get_user_organization_id()
        )
    );

-- Tags: Users can CRUD tags within their organization
CREATE POLICY "Users can view org tags"
    ON tags FOR SELECT
    TO authenticated
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org tags"
    ON tags FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org tags"
    ON tags FOR UPDATE
    TO authenticated
    USING (organization_id = get_user_organization_id());

-- Email Tags: Users can CRUD email tags for emails in their org
CREATE POLICY "Users can view org email tags"
    ON email_tags FOR SELECT
    TO authenticated
    USING (
        email_id IN (
            SELECT id FROM emails_raw WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can insert org email tags"
    ON email_tags FOR INSERT
    TO authenticated
    WITH CHECK (
        email_id IN (
            SELECT id FROM emails_raw WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can delete org email tags"
    ON email_tags FOR DELETE
    TO authenticated
    USING (
        email_id IN (
            SELECT id FROM emails_raw WHERE organization_id = get_user_organization_id()
        )
    );

-- Deal LP Relationships: Users can CRUD within their organization
CREATE POLICY "Users can view org deal LP relationships"
    ON deal_lp_relationships FOR SELECT
    TO authenticated
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can insert org deal LP relationships"
    ON deal_lp_relationships FOR INSERT
    TO authenticated
    WITH CHECK (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can update org deal LP relationships"
    ON deal_lp_relationships FOR UPDATE
    TO authenticated
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can delete org deal LP relationships"
    ON deal_lp_relationships FOR DELETE
    TO authenticated
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id = get_user_organization_id()
        )
    );

-- Service role bypass (for cron jobs and server-side operations)
-- Note: Service role key bypasses RLS by default in Supabase
