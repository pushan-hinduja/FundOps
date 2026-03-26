-- Migration 043: Add auth_user_id to organization_invites
-- Tracks the Supabase auth user created by inviteUserByEmail so we can
-- clean it up if the invite is canceled (allowing re-invites).

ALTER TABLE organization_invites
ADD COLUMN auth_user_id UUID;
