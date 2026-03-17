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

// ============================================
// Enum Types
// ============================================

export type InvestorType =
  | "individual"
  | "institution"
  | "family_office"
  | "fund_of_funds"
  | "endowment"
  | "pension"
  | "sovereign_wealth";

export type AccreditationStatus =
  | "accredited_investor"
  | "qualified_purchaser"
  | "qualified_client"
  | "non_accredited";

export type TaxStatus =
  | "us_individual"
  | "us_entity"
  | "foreign_individual"
  | "foreign_entity"
  | "tax_exempt";

export type WireStatus = "pending" | "partial" | "complete";

export type ReportingFrequency = "monthly" | "quarterly" | "annual";

export type InvestorUpdateFrequency = "monthly" | "quarterly" | "semi_annual" | "annual";

export type InvestorUpdateStatus = "pending_request" | "request_sent" | "response_received" | "sent_to_lps";

// ============================================
// Label Mappings for Dropdowns
// ============================================

export const INVESTOR_TYPE_LABELS: Record<InvestorType, string> = {
  individual: "Individual",
  institution: "Institution",
  family_office: "Family Office",
  fund_of_funds: "Fund of Funds",
  endowment: "Endowment",
  pension: "Pension Fund",
  sovereign_wealth: "Sovereign Wealth Fund",
};

export const ACCREDITATION_STATUS_LABELS: Record<AccreditationStatus, string> = {
  accredited_investor: "Accredited Investor",
  qualified_purchaser: "Qualified Purchaser",
  qualified_client: "Qualified Client",
  non_accredited: "Non-Accredited",
};

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  us_individual: "US Individual",
  us_entity: "US Entity",
  foreign_individual: "Foreign Individual",
  foreign_entity: "Foreign Entity",
  tax_exempt: "Tax Exempt",
};

export const WIRE_STATUS_LABELS: Record<WireStatus, string> = {
  pending: "Pending",
  partial: "Partial",
  complete: "Complete",
};

export const REPORTING_FREQUENCY_LABELS: Record<ReportingFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export const INVESTOR_UPDATE_FREQUENCY_LABELS: Record<InvestorUpdateFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
};

// ============================================
// Manual type definitions for use in components
// ============================================

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
  created_at: string;
  updated_at: string;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: "admin" | "partner" | "ops" | "member";
  created_at: string;
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
  // LP Passport fields
  investor_type: InvestorType | null;
  accreditation_status: AccreditationStatus | null;
  tax_status: TaxStatus | null;
  // Special Deal Terms
  special_fee_percent: number | null;
  special_carry_percent: number | null;
  // Manual preferences
  preferred_sectors: string[];
  preferred_stages: string[];
  preferred_geographies: string[];
  // Derived preferences (from deal history + emails)
  derived_sectors: string[];
  derived_stages: string[];
  derived_geographies: string[];
  last_deal_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DealAccess = "public" | "private";

export type DealSector =
  | "fintech"
  | "healthcare"
  | "saas"
  | "ai_ml"
  | "consumer"
  | "enterprise"
  | "biotech"
  | "climate"
  | "crypto"
  | "other";

export type DealGeography =
  | "us"
  | "europe"
  | "asia"
  | "global"
  | "latam"
  | "mena"
  | "africa";

export const DEAL_SECTOR_LABELS: Record<DealSector, string> = {
  fintech: "Fintech",
  healthcare: "Healthcare",
  saas: "SaaS",
  ai_ml: "AI / ML",
  consumer: "Consumer",
  enterprise: "Enterprise",
  biotech: "Biotech",
  climate: "Climate",
  crypto: "Crypto / Web3",
  other: "Other",
};

export const DEAL_GEOGRAPHY_LABELS: Record<DealGeography, string> = {
  us: "United States",
  europe: "Europe",
  asia: "Asia",
  global: "Global",
  latam: "Latin America",
  mena: "MENA",
  africa: "Africa",
};

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
  created_date: string | null;
  close_date: string | null;
  investment_stage: string | null;
  investment_type: string | null;
  founder_email: string | null;
  investor_update_frequency: InvestorUpdateFrequency | null;
  access: DealAccess;
  sector: string | null;
  geography: string | null;
  investment_thesis: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorUpdate {
  id: string;
  organization_id: string;
  deal_id: string;
  update_number: number;
  status: InvestorUpdateStatus;
  due_date: string;
  request_email_thread_id: string | null;
  request_email_message_id: string | null;
  request_sent_at: string | null;
  response_received_at: string | null;
  response_email_id: string | null;
  response_body: string | null;
  lp_email_sent_at: string | null;
  lp_gmail_message_id: string | null;
  sent_by: string | null;
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
  intent: "interested" | "committed" | "declined" | "question" | null;
  commitment_amount: number | null;
  sentiment: "positive" | "neutral" | "negative" | "urgent" | null;
  extracted_questions: string[];
  has_wire_details: boolean | null;
  parsing_method: "simple" | "ai" | "manual";
  entities: Json;
  confidence_scores: Json;
  processing_status: "pending" | "processing" | "success" | "failed" | "manual_review";
  error_message: string | null;
  manual_override: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  model_version: string | null;
  parsed_at: string;
  is_answered: boolean;
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
  // Deal-specific terms
  management_fee_percent: number | null;
  carry_percent: number | null;
  minimum_commitment: number | null;
  side_letter_terms: string | null;
  has_mfn_rights: boolean;
  has_coinvest_rights: boolean;
  reporting_frequency: ReportingFrequency | null;
  // Allocation tracking
  reserved_amount: number | null;
  wire_status: WireStatus;
  wire_amount_received: number | null;
  wire_received_at: string | null;
  close_date: string | null;
  created_at: string;
  updated_at: string;
}

// Extended type with LP contact info for joined queries
export interface DealLPRelationshipWithLP extends DealLPRelationship {
  lp_contacts: Pick<LPContact, "id" | "name" | "email" | "firm"> | null;
}

// Extended type with deal info for joined queries
export interface DealLPRelationshipWithDeal extends DealLPRelationship {
  deals: Pick<Deal, "id" | "name" | "company_name" | "status" | "target_raise"> | null;
}

// Close readiness metrics type
export interface CloseReadinessMetrics {
  wiredPercent: number;
  allocatedPercent: number;
  totalLPs: number;
  totalAllocated: number;
  totalWired: number;
  targetRaise: number;
  pendingItems: {
    lpId: string;
    lpName: string;
    pendingWire: boolean;
    amount: number;
  }[];
}

// ============================================
// AI Email Response Types
// ============================================

export type ResponseTone = "professional" | "friendly" | "formal" | "concise";

export interface UserSettings {
  id: string;
  user_id: string;
  settings: {
    ai_response_tone?: ResponseTone;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface EmailResponse {
  id: string;
  organization_id: string;
  original_email_id: string;
  question_text: string;
  ai_generated_response: string;
  final_response: string;
  sent_at: string | null;
  sent_by: string | null;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  tone_used: ResponseTone | null;
  deal_context: {
    deal_id: string;
    deal_name: string;
    company_name: string | null;
    target_raise: number | null;
    fee_percent: number | null;
    carry_percent: number | null;
  } | null;
  created_at: string;
}

export const RESPONSE_TONE_LABELS: Record<ResponseTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  formal: "Formal",
  concise: "Concise",
};

// ============================================
// Chat Session Types
// ============================================

export interface ChatSession {
  id: string;
  user_id: string;
  organization_id: string;
  title: string | null;
  is_active: boolean;
  message_count: number;
  total_tokens_used: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: Json | null;
  input_tokens: number | null;
  output_tokens: number | null;
  sequence_number: number;
  created_at: string;
}

// ============================================
// Agent Memory Types
// ============================================

export type MemoryCategory =
  | "lp_preference"
  | "lp_relationship"
  | "deal_insight"
  | "user_preference"
  | "process_note"
  | "market_context"
  | "follow_up";

export type InsightType =
  | "silent_lps"
  | "deadline_approaching"
  | "commitment_milestone"
  | "engagement_drop"
  | "wire_stalled"
  | "follow_up_due";

export type InsightPriority = "low" | "medium" | "high" | "urgent";

export interface AgentMemory {
  id: string;
  user_id: string;
  organization_id: string;
  category: MemoryCategory;
  content: string;
  lp_contact_id: string | null;
  deal_id: string | null;
  source_session_id: string | null;
  source_message_id: string | null;
  confidence: number;
  access_count: number;
  last_accessed_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentInsight {
  id: string;
  organization_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  deal_id: string | null;
  lp_contact_ids: string[] | null;
  priority: InsightPriority;
  is_dismissed: boolean;
  dismissed_by: string | null;
  dismissed_at: string | null;
  insight_hash: string;
  created_at: string;
}

// ============================================
// LP Match Score Types
// ============================================

export interface LPMatchScore {
  id: string;
  deal_id: string;
  lp_contact_id: string;
  total_score: number;
  check_size_score: number;
  sector_score: number;
  stage_score: number;
  geography_score: number;
  recency_score: number;
  score_breakdown: Json | null;
  is_excluded: boolean;
  computed_at: string;
}

export interface LPMatchScoreWithLP extends LPMatchScore {
  lp_contacts: Pick<LPContact, "id" | "name" | "email" | "firm" | "preferred_check_size" | "investor_type"> | null;
}

// ============================================
// Draft Deal Types
// ============================================

export type DealVoteValue = "up" | "down" | "sideways";

export interface DealDraftData {
  id: string;
  deal_id: string;
  valuation: number | null;
  round_size: number | null;
  revenue_current_year: number | null;
  revenue_previous_year: number | null;
  yoy_growth: number | null;
  ebitda: number | null;
  is_profitable: boolean | null;
  team_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealVote {
  id: string;
  deal_id: string;
  user_id: string;
  vote: DealVoteValue;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealVoteWithUser extends DealVote {
  users: Pick<User, "id" | "name" | "email"> | null;
}

export interface DealNote {
  id: string;
  deal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DealNoteWithUser extends DealNote {
  users: Pick<User, "id" | "name" | "email"> | null;
}
