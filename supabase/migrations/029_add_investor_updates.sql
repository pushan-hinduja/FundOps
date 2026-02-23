-- Add investor update fields to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS founder_email TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS investor_update_frequency TEXT CHECK (investor_update_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'));

-- Create investor_updates table
CREATE TABLE IF NOT EXISTS investor_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  update_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_request' CHECK (status IN ('pending_request', 'request_sent', 'response_received', 'sent_to_lps')),
  due_date DATE NOT NULL,
  request_email_thread_id TEXT,
  request_email_message_id TEXT,
  request_sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_email_id UUID REFERENCES emails_raw(id) ON DELETE SET NULL,
  response_body TEXT,
  lp_email_sent_at TIMESTAMPTZ,
  lp_gmail_message_id TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one update per deal per due date
CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_updates_deal_due_date ON investor_updates (deal_id, due_date);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_investor_updates_org ON investor_updates (organization_id);
CREATE INDEX IF NOT EXISTS idx_investor_updates_deal ON investor_updates (deal_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_investor_updates_status ON investor_updates (status) WHERE status IN ('pending_request', 'request_sent');
CREATE INDEX IF NOT EXISTS idx_investor_updates_thread ON investor_updates (request_email_thread_id) WHERE request_email_thread_id IS NOT NULL;

-- Auto-update trigger for updated_at
CREATE OR REPLACE TRIGGER update_investor_updates_updated_at
  BEFORE UPDATE ON investor_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE investor_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org investor updates"
  ON investor_updates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their org investor updates"
  ON investor_updates FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their org investor updates"
  ON investor_updates FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Service role bypass for CRON operations
CREATE POLICY "Service role full access to investor updates"
  ON investor_updates FOR ALL
  USING (auth.role() = 'service_role');
