-- Draft deal financial data (1:1 with deals)
CREATE TABLE deal_draft_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
    valuation DECIMAL,
    round_size DECIMAL,
    revenue_current_year DECIMAL,
    revenue_previous_year DECIMAL,
    yoy_growth DECIMAL,
    ebitda DECIMAL,
    is_profitable BOOLEAN,
    team_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deal_draft_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view draft data for their org deals"
    ON deal_draft_data FOR SELECT TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert draft data for their org deals"
    ON deal_draft_data FOR INSERT TO authenticated
    WITH CHECK (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update draft data for their org deals"
    ON deal_draft_data FOR UPDATE TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- Deal votes (one per user per deal)
CREATE TABLE deal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('up', 'down', 'sideways')),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(deal_id, user_id)
);

CREATE INDEX idx_deal_votes_deal ON deal_votes(deal_id);

ALTER TABLE deal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes for their org deals"
    ON deal_votes FOR SELECT TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert their own votes"
    ON deal_votes FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own votes"
    ON deal_votes FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
