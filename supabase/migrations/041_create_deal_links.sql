-- Deal links table (replaces single memo_url field)
CREATE TABLE deal_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL CHECK (link_type IN ('data_room', 'deal_folder')),
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_links_deal ON deal_links(deal_id);

ALTER TABLE deal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deal links"
    ON deal_links FOR SELECT TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert deal links"
    ON deal_links FOR INSERT TO authenticated
    WITH CHECK (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete deal links"
    ON deal_links FOR DELETE TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));
