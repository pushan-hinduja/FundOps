-- Migration 004: Auth Accounts table
-- OAuth tokens for Gmail/Outlook (encrypted)

CREATE TABLE auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,  -- encrypted
    refresh_token TEXT NOT NULL, -- encrypted
    token_expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_cursor TEXT, -- Gmail historyId for incremental sync
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, email)
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_auth_accounts_updated_at
    BEFORE UPDATE ON auth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_auth_accounts_user ON auth_accounts(user_id);
CREATE INDEX idx_auth_accounts_active ON auth_accounts(is_active) WHERE is_active = true;
