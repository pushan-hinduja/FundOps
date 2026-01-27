import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Building2,
  Phone,
  DollarSign,
} from "lucide-react";
import { LPDetailClient } from "./LPDetailClient";
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
  params: { id: string };
}) {
  const supabase = await createClient();

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
    .eq("id", params.id)
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
        .eq("lp_contact_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("lp_wiring_instructions")
        .select("*")
        .eq("lp_contact_id", params.id)
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
        .eq("lp_contact_id", params.id)
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
            received_at
          )
        `
        )
        .eq("detected_lp_id", params.id)
        .order("parsed_at", { ascending: false })
        .limit(20),
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
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "pending":
      case "in_review":
        return "bg-yellow-500/10 text-yellow-600";
      case "rejected":
      case "expired":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getAccreditationColor = (status: AccreditationStatus | null) => {
    if (!status) return "bg-secondary text-muted-foreground";
    switch (status) {
      case "qualified_purchaser":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "accredited_investor":
      case "qualified_client":
        return "bg-foreground/10 text-foreground";
      case "non_accredited":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getIntentColor = (intent: string | null) => {
    switch (intent) {
      case "committed":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "interested":
        return "bg-foreground/10 text-foreground";
      case "declined":
        return "bg-destructive/10 text-destructive";
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
            className={`px-3 py-1.5 rounded-xl text-sm font-medium ${getKYCStatusColor(
              lp.kyc_status
            )}`}
          >
            KYC: {KYC_STATUS_LABELS[lp.kyc_status]}
          </span>
          {lp.accreditation_status && (
            <span
              className={`px-3 py-1.5 rounded-xl text-sm font-medium ${getAccreditationColor(
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
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Total Commitments</p>
          <p className="metric-number text-2xl text-[hsl(var(--success))]">
            {formatCurrency(lp.total_commitments)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Preferred Check Size</p>
          <p className="metric-number text-2xl">
            {formatCurrency(lp.preferred_check_size)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Participation Rate</p>
          <p className="metric-number text-2xl">
            {lp.participation_rate
              ? `${Math.round(lp.participation_rate * 100)}%`
              : "-"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Avg Response Time</p>
          <p className="metric-number text-2xl">
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
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-3">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {lp.notes}
              </p>
            </div>
          )}

          {/* Recent Emails */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4">Recent Emails</h2>
            {recentEmails && recentEmails.length > 0 ? (
              <div className="space-y-3">
                {recentEmails.slice(0, 10).map((parsed: any) => (
                  <div
                    key={parsed.id}
                    className="py-3 border-b border-border last:border-0"
                  >
                    <p className="font-medium text-sm truncate">
                      {parsed.emails_raw?.from_name ||
                        parsed.emails_raw?.from_email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {parsed.emails_raw?.subject || "(no subject)"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {parsed.intent && parsed.intent !== "neutral" && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-lg font-medium ${getIntentColor(
                            parsed.intent
                          )}`}
                        >
                          {parsed.intent}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {parsed.emails_raw?.received_at &&
                          formatDistanceToNow(
                            new Date(parsed.emails_raw.received_at),
                            { addSuffix: true }
                          )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No emails matched to this LP yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
