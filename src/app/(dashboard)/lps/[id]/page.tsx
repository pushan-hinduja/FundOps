import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Building2,
  Phone,
  DollarSign,
} from "lucide-react";
import { LPDetailClient } from "./LPDetailClient";
import { EmailsWithFilters } from "@/components/deals/EmailsWithFilters";
import {
  LPContact,
  LPDocument,
  LPWiringInstructions,
  DealLPRelationshipWithDeal,
  KYC_STATUS_LABELS,
  ACCREDITATION_STATUS_LABELS,
  KYCStatus,
  AccreditationStatus,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function LPDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's organization
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return notFound();
  }

  // Fetch LP contact
  const { data: lpData, error: lpError } = await supabase
    .from("lp_contacts")
    .select("*")
    .eq("id", id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (lpError || !lpData) {
    return notFound();
  }

  // Cast to LPContact type
  const lp = lpData as LPContact;

  // Fetch documents, wiring instructions, deal relationships, and recent emails in parallel
  const [documentsResult, wiringResult, relationshipsResult, emailsResult] =
    await Promise.all([
      supabase
        .from("lp_documents")
        .select("*")
        .eq("lp_contact_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("lp_wiring_instructions")
        .select("*")
        .eq("lp_contact_id", id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("deal_lp_relationships")
        .select(
          `
          *,
          deals (
            id,
            name,
            company_name,
            status,
            target_raise
          )
        `
        )
        .eq("lp_contact_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("emails_parsed")
        .select(
          `
          *,
          emails_raw (
            id,
            from_email,
            from_name,
            subject,
            received_at,
            body_text,
            thread_id,
            message_id
          ),
          lp_contacts (
            id,
            name,
            email,
            firm
          )
        `
        )
        .eq("detected_lp_id", id)
        .order("parsed_at", { ascending: false })
        .limit(50),
    ]);

  const documents = (documentsResult.data || []) as LPDocument[];
  const wiringInstructions =
    (wiringResult.data || []) as LPWiringInstructions[];
  const dealRelationships =
    (relationshipsResult.data || []) as DealLPRelationshipWithDeal[];
  const recentEmails = emailsResult.data || [];

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getKYCStatusColor = (status: KYCStatus) => {
    switch (status) {
      case "approved":
        return "bg-secondary text-green-600";
      case "pending":
      case "in_review":
        return "bg-secondary text-yellow-600";
      case "rejected":
      case "expired":
        return "bg-secondary text-red-600";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getAccreditationColor = (status: AccreditationStatus | null) => {
    if (!status) return "bg-secondary text-muted-foreground";
    switch (status) {
      case "qualified_purchaser":
        return "bg-secondary text-green-600";
      case "accredited_investor":
      case "qualified_client":
        return "bg-secondary text-foreground";
      case "non_accredited":
        return "bg-secondary text-red-600";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };


  return (
    <div className="px-8 py-6">
      {/* Back link */}
      <Link
        href="/lps"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to LPs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">{lp.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            {lp.firm && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {lp.firm}
              </span>
            )}
            {lp.title && <span>{lp.title}</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              {lp.email}
            </span>
            {lp.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                {lp.phone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getKYCStatusColor(
              lp.kyc_status
            )}`}
          >
            KYC: {KYC_STATUS_LABELS[lp.kyc_status]}
          </span>
          {lp.accreditation_status && (
            <span
              className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getAccreditationColor(
                lp.accreditation_status
              )}`}
            >
              {ACCREDITATION_STATUS_LABELS[lp.accreditation_status]}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Total Commitments</p>
          <p className="metric-number text-3xl text-[hsl(var(--success))]">
            {formatCurrency(lp.total_commitments)}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Preferred Check Size</p>
          <p className="metric-number text-3xl">
            {formatCurrency(lp.preferred_check_size)}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Participation Rate</p>
          <p className="metric-number text-3xl">
            {lp.participation_rate
              ? `${Math.round(lp.participation_rate * 100)}%`
              : "-"}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Avg Response Time</p>
          <p className="metric-number text-3xl">
            {lp.avg_response_time_hours
              ? `${Math.round(lp.avg_response_time_hours)}h`
              : "-"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content - Profile, Documents, Wiring, Deal History */}
        <div className="col-span-2 space-y-6">
          <LPDetailClient
            lp={lp}
            documents={documents}
            wiringInstructions={wiringInstructions}
            dealRelationships={dealRelationships}
          />
        </div>

        {/* Sidebar - Recent Emails */}
        <div className="space-y-6">
          {/* Notes */}
          {lp.notes && (
            <div className="glass-card rounded-2xl">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-medium">Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lp.notes}
                </p>
              </div>
            </div>
          )}

          {/* Recent Emails */}
          <EmailsWithFilters
            emails={recentEmails || []}
          />
        </div>
      </div>
    </div>
  );
}
