-- Agent memories table
CREATE TABLE agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'lp_preference',
        'lp_relationship',
        'deal_insight',
        'user_preference',
        'process_note',
        'market_context',
        'follow_up'
    )),
    content TEXT NOT NULL,
    lp_contact_id UUID REFERENCES lp_contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    source_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    source_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_user_org ON agent_memories(user_id, organization_id) WHERE is_active = true;
CREATE INDEX idx_memories_category ON agent_memories(category) WHERE is_active = true;
CREATE INDEX idx_memories_lp ON agent_memories(lp_contact_id) WHERE is_active = true;
CREATE INDEX idx_memories_deal ON agent_memories(deal_id) WHERE is_active = true;
CREATE INDEX idx_memories_last_accessed ON agent_memories(last_accessed_at DESC NULLS LAST) WHERE is_active = true;

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
    ON agent_memories FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memories"
    ON agent_memories FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memories"
    ON agent_memories FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own memories"
    ON agent_memories FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Proactive insights table
CREATE TABLE agent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'silent_lps',
        'deadline_approaching',
        'commitment_milestone',
        'engagement_drop',
        'wire_stalled',
        'follow_up_due'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    lp_contact_ids UUID[],
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_by UUID REFERENCES auth.users(id),
    dismissed_at TIMESTAMPTZ,
    insight_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_insights_dedup ON agent_insights(organization_id, insight_hash) WHERE NOT is_dismissed;
CREATE INDEX idx_insights_org ON agent_insights(organization_id, created_at DESC) WHERE NOT is_dismissed;

ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org insights"
    ON agent_insights FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can dismiss org insights"
    ON agent_insights FOR UPDATE TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Service role can insert insights (for cron jobs)
CREATE POLICY "Service can insert insights"
    ON agent_insights FOR INSERT TO service_role
    WITH CHECK (true);
