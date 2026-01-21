// Database types - will be auto-generated from Supabase later
// For now, define the core types manually

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          organization_id: string | null;
          role: "admin" | "partner" | "ops" | "member";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          organization_id?: string | null;
          role?: "admin" | "partner" | "ops" | "member";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          organization_id?: string | null;
          role?: "admin" | "partner" | "ops" | "member";
          created_at?: string;
          updated_at?: string;
        };
      };
      auth_accounts: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: "gmail" | "outlook";
          email: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          is_active?: boolean;
          last_sync_at?: string | null;
          sync_cursor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: "gmail" | "outlook";
          email?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          is_active?: boolean;
          last_sync_at?: string | null;
          sync_cursor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lp_contacts: {
        Row: {
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
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email: string;
          firm?: string | null;
          title?: string | null;
          phone?: string | null;
          preferred_check_size?: number | null;
          avg_response_time_hours?: number | null;
          total_commitments?: number;
          participation_rate?: number | null;
          last_interaction_at?: string | null;
          tags?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          firm?: string | null;
          title?: string | null;
          phone?: string | null;
          preferred_check_size?: number | null;
          avg_response_time_hours?: number | null;
          total_commitments?: number;
          participation_rate?: number | null;
          last_interaction_at?: string | null;
          tags?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
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
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          company_name?: string | null;
          description?: string | null;
          target_raise?: number | null;
          min_check_size?: number | null;
          max_check_size?: number | null;
          deadline?: string | null;
          status?: "draft" | "active" | "closed" | "cancelled";
          total_committed?: number;
          total_interested?: number;
          memo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          company_name?: string | null;
          description?: string | null;
          target_raise?: number | null;
          min_check_size?: number | null;
          max_check_size?: number | null;
          deadline?: string | null;
          status?: "draft" | "active" | "closed" | "cancelled";
          total_committed?: number;
          total_interested?: number;
          memo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      emails_raw: {
        Row: {
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
        };
        Insert: {
          id?: string;
          organization_id: string;
          auth_account_id: string;
          message_id: string;
          thread_id?: string | null;
          from_email: string;
          from_name?: string | null;
          to_emails?: string[];
          cc_emails?: string[];
          subject?: string | null;
          body_text?: string | null;
          body_html?: string | null;
          received_at: string;
          has_attachments?: boolean;
          raw_payload?: Json | null;
          ingested_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          auth_account_id?: string;
          message_id?: string;
          thread_id?: string | null;
          from_email?: string;
          from_name?: string | null;
          to_emails?: string[];
          cc_emails?: string[];
          subject?: string | null;
          body_text?: string | null;
          body_html?: string | null;
          received_at?: string;
          has_attachments?: boolean;
          raw_payload?: Json | null;
          ingested_at?: string;
        };
      };
      emails_parsed: {
        Row: {
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
        };
        Insert: {
          id?: string;
          email_id: string;
          detected_lp_id?: string | null;
          detected_deal_id?: string | null;
          intent?: "interested" | "committed" | "declined" | "question" | "neutral" | null;
          commitment_amount?: number | null;
          sentiment?: "positive" | "neutral" | "negative" | "urgent" | null;
          topics?: string[];
          entities?: Json;
          confidence_scores?: Json;
          processing_status?: "pending" | "processing" | "success" | "failed" | "manual_review";
          error_message?: string | null;
          manual_override?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          model_version?: string | null;
          parsed_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          detected_lp_id?: string | null;
          detected_deal_id?: string | null;
          intent?: "interested" | "committed" | "declined" | "question" | "neutral" | null;
          commitment_amount?: number | null;
          sentiment?: "positive" | "neutral" | "negative" | "urgent" | null;
          topics?: string[];
          entities?: Json;
          confidence_scores?: Json;
          processing_status?: "pending" | "processing" | "success" | "failed" | "manual_review";
          error_message?: string | null;
          manual_override?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          model_version?: string | null;
          parsed_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: "intent" | "topic" | "priority" | "sentiment" | "custom";
          color: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          type: "intent" | "topic" | "priority" | "sentiment" | "custom";
          color?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          type?: "intent" | "topic" | "priority" | "sentiment" | "custom";
          color?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      email_tags: {
        Row: {
          id: string;
          email_id: string;
          tag_id: string;
          confidence: number | null;
          source: "ai" | "manual";
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          tag_id: string;
          confidence?: number | null;
          source: "ai" | "manual";
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          tag_id?: string;
          confidence?: number | null;
          source?: "ai" | "manual";
          created_by?: string | null;
          created_at?: string;
        };
      };
      deal_lp_relationships: {
        Row: {
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
        };
        Insert: {
          id?: string;
          deal_id: string;
          lp_contact_id: string;
          status?: "contacted" | "interested" | "committed" | "allocated" | "declined";
          committed_amount?: number | null;
          allocated_amount?: number | null;
          first_contact_at?: string | null;
          latest_response_at?: string | null;
          response_time_hours?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          lp_contact_id?: string;
          status?: "contacted" | "interested" | "committed" | "allocated" | "declined";
          committed_amount?: number | null;
          allocated_amount?: number | null;
          first_contact_at?: string | null;
          latest_response_at?: string | null;
          response_time_hours?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      get_user_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {};
  };
}

// Convenience type exports
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type AuthAccount = Database["public"]["Tables"]["auth_accounts"]["Row"];
export type LPContact = Database["public"]["Tables"]["lp_contacts"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type EmailRaw = Database["public"]["Tables"]["emails_raw"]["Row"];
export type EmailParsed = Database["public"]["Tables"]["emails_parsed"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type EmailTag = Database["public"]["Tables"]["email_tags"]["Row"];
export type DealLPRelationship = Database["public"]["Tables"]["deal_lp_relationships"]["Row"];
