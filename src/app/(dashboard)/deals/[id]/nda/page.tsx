import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { NdaAcceptanceClient } from "./NdaAcceptanceClient";

export const dynamic = "force-dynamic";

export default async function NdaAcceptancePage({
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

  // Fetch the deal
  const { data: deal } = await supabase
    .from("deals")
    .select("id, name, company_name, nda_document_url, organization_id")
    .eq("id", id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (!deal) return notFound();

  // Check if already accepted
  const { data: existingAcceptance } = await supabase
    .from("deal_nda_acceptances")
    .select("id")
    .eq("deal_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingAcceptance) {
    redirect(`/deals/${id}`);
  }

  // Generate a signed URL for the NDA document if one exists
  let documentUrl: string | null = null;
  if (deal.nda_document_url) {
    const { data: signedUrlData } = await supabase.storage
      .from("nda-documents")
      .createSignedUrl(deal.nda_document_url, 3600);
    documentUrl = signedUrlData?.signedUrl || null;
  }

  return (
    <NdaAcceptanceClient
      dealId={deal.id}
      dealName={deal.name}
      companyName={deal.company_name}
      documentUrl={documentUrl}
    />
  );
}
