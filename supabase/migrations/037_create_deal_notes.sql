CREATE TABLE deal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_notes_deal ON deal_notes(deal_id, created_at DESC);

ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their org deals"
    ON deal_notes FOR SELECT TO authenticated
    USING (deal_id IN (
        SELECT id FROM deals WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert their own notes"
    ON deal_notes FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
