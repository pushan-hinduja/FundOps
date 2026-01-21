// Database types - will be auto-generated from Supabase later
// Run: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
// For now, define minimal types to avoid build errors

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Simplified Database type - use 'any' for now until we generate from Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

// Manual type definitions for use in components
export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  organization_id: string | null;
  role: "admin" | "partner" | "ops" | "member";
  created_at: string;
  updated_at: string;
}

export interface AuthAccount {
  id: string;
  user_id: string;
  provider: "gmail" | "outlook";
  email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_cursor: string | null;
  created_at: string;
  updated_at: string;
}

export interface LPContact {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  firm: string | null;
  title: string | null;
  phone: string | null;
  preferred_check_size: number | null;
  avg_response_time_hours: number | null;
  total_commitments: number;
  participation_rate: number | null;
  last_interaction_at: string | null;
  tags: Json;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  organization_id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  target_raise: number | null;
  min_check_size: number | null;
  max_check_size: number | null;
  deadline: string | null;
  status: "draft" | "active" | "closed" | "cancelled";
  total_committed: number;
  total_interested: number;
  memo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailRaw {
  id: string;
  organization_id: string;
  auth_account_id: string;
  message_id: string;
  thread_id: string | null;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  has_attachments: boolean;
  raw_payload: Json | null;
  ingested_at: string;
}

export interface EmailParsed {
  id: string;
  email_id: string;
  detected_lp_id: string | null;
  detected_deal_id: string | null;
  intent: "interested" | "committed" | "declined" | "question" | "neutral" | null;
  commitment_amount: number | null;
  sentiment: "positive" | "neutral" | "negative" | "urgent" | null;
  topics: string[];
  entities: Json;
  confidence_scores: Json;
  processing_status: "pending" | "processing" | "success" | "failed" | "manual_review";
  error_message: string | null;
  manual_override: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  model_version: string | null;
  parsed_at: string;
}

export interface Tag {
  id: string;
  organization_id: string;
  name: string;
  type: "intent" | "topic" | "priority" | "sentiment" | "custom";
  color: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmailTag {
  id: string;
  email_id: string;
  tag_id: string;
  confidence: number | null;
  source: "ai" | "manual";
  created_by: string | null;
  created_at: string;
}

export interface DealLPRelationship {
  id: string;
  deal_id: string;
  lp_contact_id: string;
  status: "contacted" | "interested" | "committed" | "allocated" | "declined";
  committed_amount: number | null;
  allocated_amount: number | null;
  first_contact_at: string | null;
  latest_response_at: string | null;
  response_time_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
