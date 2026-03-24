import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DraftDealSection } from "@/components/deal/DraftDealSection";
import { DealVotingCard } from "@/components/deal/DealVotingCard";

export const dynamic = "force-dynamic";

export default async function DealNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return notFound();

  const { data: deal } = await supabase
    .from("deals")
    .select("id, name, company_name")
    .eq("id", id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (!deal) return notFound();

  // Verify draft data exists
  const { data: draftData } = await supabase
    .from("deal_draft_data")
    .select("id")
    .eq("deal_id", id)
    .maybeSingle();

  if (!draftData) return notFound();

  return (
    <div className="px-8 py-6">
      <div className="mb-8">
        <Link
          href={`/deals/${deal.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {deal.name}
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-medium tracking-tight">
            Deal Notes
            <span className="text-muted-foreground">
              {" "}— {deal.name}{deal.company_name ? ` (${deal.company_name})` : ""}
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DraftDealSection dealId={deal.id} />
        <DealVotingCard dealId={deal.id} />
      </div>
    </div>
  );
}
