import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DraftDealSection } from "@/components/deal/DraftDealSection";
import { DealVotingCard } from "@/components/deal/DealVotingCard";

export const dynamic = "force-dynamic";

export default async function DraftNotesPage({
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
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/deals/${deal.id}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {deal.name}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Draft Notes</h1>
        <p className="text-muted-foreground">
          {deal.name}{deal.company_name ? ` — ${deal.company_name}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <DraftDealSection dealId={deal.id} readOnly />
        <DealVotingCard dealId={deal.id} readOnly />
      </div>
    </div>
  );
}
