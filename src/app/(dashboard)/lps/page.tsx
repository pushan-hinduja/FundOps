import { createClient } from "@/lib/supabase/server";
import { HubSpotSyncButton } from "@/components/shared/HubSpotSyncButton";
import { EmailSyncButton } from "@/components/shared/EmailSyncButton";
import { SuggestedContacts } from "@/components/shared/SuggestedContacts";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Plus, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LPsPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's organization
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-3xl font-medium tracking-tight mb-4">LP Contacts</h1>
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">
            Set up your organization first.
          </p>
          <Link href="/settings" className="text-foreground font-medium hover:underline mt-2 inline-block">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // Fetch LPs and suggested contacts in parallel (both use same email data source)
  let lps: any[] | null = null;
  let error: any = null;
  let suggestedContacts: { id: string; email: string; name: string; firm: string | null; title: string | null }[] = [];
  
  console.log(`[LPs Page] Loading for organization: ${userData.organization_id}`);
  
  try {
    // First verify auth_accounts exist for debugging
    const { data: authAccounts, error: authError } = await supabase
      .from("auth_accounts")
      .select("id, email, is_active")
      .eq("user_id", user.id);
    
    console.log(`[LPs Page] Found ${authAccounts?.length || 0} auth accounts for user`);
    if (authAccounts && authAccounts.length > 0) {
      authAccounts.forEach(acc => {
        console.log(`[LPs Page]   - ${acc.email} (active: ${acc.is_active})`);
      });
    }
    
    const [lpsResult, suggestedContactsResult] = await Promise.all([
      supabase
        .from("lp_contacts")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .order("last_interaction_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("suggested_contacts")
        .select("id, email, name, firm, title")
        .eq("organization_id", userData.organization_id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false }),
    ]);

    lps = lpsResult.data;
    error = lpsResult.error;
    suggestedContacts = suggestedContactsResult.data || [];
    
    console.log(`[LPs Page] Loaded ${lps?.length || 0} LPs and ${suggestedContacts.length} suggested contacts`);
  } catch (err) {
    console.error("Error in LPs page:", err);
    // Fallback to empty data
    lps = [];
    error = err instanceof Error ? err : new Error("Failed to load data");
    suggestedContacts = [];
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* LP Contacts Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-medium tracking-tight">LP Contacts</h1>
              <p className="text-muted-foreground mt-1">Manage your limited partner relationships</p>
            </div>
            <div className="flex items-center gap-3">
              <EmailSyncButton />
              <HubSpotSyncButton />
              <Link
                href="/lps/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add LP
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6">
              Error loading LPs: {error.message}
            </div>
          )}

          {!lps || lps.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No LP contacts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                LPs are automatically created when emails are parsed, or you can add them manually.
              </p>
              <Link
                href="/lps/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add LP Manually
              </Link>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left section-label">Name</th>
                    <th className="px-6 py-4 text-left section-label">Firm</th>
                    <th className="px-6 py-4 text-left section-label">Email</th>
                    <th className="px-6 py-4 text-left section-label">Total Committed</th>
                    <th className="px-6 py-4 text-left section-label">Last Interaction</th>
                    <th className="px-6 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lps.map((lp) => (
                    <tr key={lp.id} className="group hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/lps/${lp.id}`} className="font-medium hover:text-foreground/70 transition-colors">
                          {lp.name}
                        </Link>
                        {lp.title && (
                          <p className="text-xs text-muted-foreground mt-0.5">{lp.title}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {lp.firm || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {lp.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-[hsl(var(--success))] metric-number">
                          {formatCurrency(lp.total_commitments)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {lp.last_interaction_at
                          ? formatDistanceToNow(new Date(lp.last_interaction_at), { addSuffix: true })
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/lps/${lp.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Contacts Sidebar - collapsible */}
      <SuggestedContacts
        organizationId={userData.organization_id}
        initialContacts={suggestedContacts}
      />
    </div>
  );
}
