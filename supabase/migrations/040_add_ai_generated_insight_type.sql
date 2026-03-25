-- Add 'ai_generated' to the insight_type check constraint
ALTER TABLE agent_insights DROP CONSTRAINT IF EXISTS agent_insights_insight_type_check;
ALTER TABLE agent_insights ADD CONSTRAINT agent_insights_insight_type_check
    CHECK (insight_type IN (
        'silent_lps',
        'deadline_approaching',
        'commitment_milestone',
        'engagement_drop',
        'wire_stalled',
        'follow_up_due',
        'ai_generated'
    ));

-- Replace partial unique index with a full unique constraint.
-- The partial index (WHERE NOT is_dismissed) is incompatible with
-- Supabase/PostgREST upsert's onConflict. A full constraint means
-- dismissed insights with the same hash block duplicates, which is
-- actually desirable — users won't see the same insight again after
-- dismissing it.
DROP INDEX IF EXISTS idx_insights_dedup;
ALTER TABLE agent_insights
    ADD CONSTRAINT uq_insights_org_hash UNIQUE (organization_id, insight_hash);
