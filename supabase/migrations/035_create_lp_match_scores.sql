CREATE TABLE lp_match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    lp_contact_id UUID NOT NULL REFERENCES lp_contacts(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL DEFAULT 0,
    check_size_score INTEGER DEFAULT 0,
    sector_score INTEGER DEFAULT 0,
    stage_score INTEGER DEFAULT 0,
    geography_score INTEGER DEFAULT 0,
    recency_score INTEGER DEFAULT 0,
    score_breakdown JSONB,
    is_excluded BOOLEAN NOT NULL DEFAULT false,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(deal_id, lp_contact_id)
);

CREATE INDEX idx_lp_match_scores_deal ON lp_match_scores(deal_id, total_score DESC);

ALTER TABLE lp_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view match scores for their org deals"
    ON lp_match_scores FOR SELECT TO authenticated
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage match scores for their org deals"
    ON lp_match_scores FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to insert/update/delete their org's match scores
CREATE POLICY "Users can insert match scores"
    ON lp_match_scores FOR INSERT TO authenticated
    WITH CHECK (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update match scores"
    ON lp_match_scores FOR UPDATE TO authenticated
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete match scores"
    ON lp_match_scores FOR DELETE TO authenticated
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );
