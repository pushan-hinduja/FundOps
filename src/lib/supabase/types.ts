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

export type KYCStatus =
  | "not_started"
  | "pending"
  | "in_review"
  | "approved"
  | "expired"
  | "rejected";

export type DocumentType =
  | "subscription_agreement"
  | "accreditation_letter"
  | "tax_form_w9"
  | "tax_form_w8"
  | "id_passport"
  | "kyc_documents"
  | "other";

export type DocumentStatus =
  | "pending"
  | "uploaded"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired";

export type WireStatus = "pending" | "partial" | "complete";

export type ReportingFrequency = "monthly" | "quarterly" | "annual";

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

export const KYC_STATUS_LABELS: Record<KYCStatus, string> = {
  not_started: "Not Started",
  pending: "Pending",
  in_review: "In Review",
  approved: "Approved",
  expired: "Expired",
  rejected: "Rejected",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  subscription_agreement: "Subscription Agreement",
  accreditation_letter: "Accreditation Letter",
  tax_form_w9: "Tax Form W-9",
  tax_form_w8: "Tax Form W-8",
  id_passport: "ID / Passport",
  kyc_documents: "KYC Documents",
  other: "Other",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Pending",
  uploaded: "Uploaded",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
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
  // LP Passport fields
  investor_type: InvestorType | null;
  accreditation_status: AccreditationStatus | null;
  tax_status: TaxStatus | null;
  kyc_status: KYCStatus;
  // Special Deal Terms
  special_fee_percent: number | null;
  special_carry_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface LPDocument {
  id: string;
  lp_contact_id: string;
  document_type: DocumentType;
  document_name: string;
  file_path: string | null;
  status: DocumentStatus;
  expiration_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LPWiringInstructions {
  id: string;
  lp_contact_id: string;
  account_label: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_address: string | null;
  intermediary_bank: string | null;
  special_instructions: string | null;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
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
  created_date: string | null;
  close_date: string | null;
  investment_stage: string | null;
  investment_type: string | null;
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
  lp_contacts: Pick<LPContact, "id" | "name" | "email" | "firm" | "kyc_status" | "accreditation_status"> | null;
}

// Extended type with deal info for joined queries
export interface DealLPRelationshipWithDeal extends DealLPRelationship {
  deals: Pick<Deal, "id" | "name" | "company_name" | "status" | "target_raise"> | null;
}

// Close readiness metrics type
export interface CloseReadinessMetrics {
  docsReceivedPercent: number;
  wiredPercent: number;
  allocatedPercent: number;
  totalLPs: number;
  lpsWithDocs: number;
  totalAllocated: number;
  totalWired: number;
  targetRaise: number;
  pendingItems: {
    lpId: string;
    lpName: string;
    missingDocs: boolean;
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
