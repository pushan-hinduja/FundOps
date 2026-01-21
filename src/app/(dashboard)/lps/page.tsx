import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

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
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">LP Contacts</h1>
        <div className="bg-muted p-8 rounded-lg text-center">
          <p className="text-muted-foreground">
            Set up your organization first.
          </p>
          <Link href="/settings" className="text-primary hover:underline mt-2 inline-block">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // Fetch LPs
  const { data: lps, error } = await supabase
    .from("lp_contacts")
    .select("*")
    .eq("organization_id", userData.organization_id)
    .order("last_interaction_at", { ascending: false, nullsFirst: false });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">LP Contacts</h1>
        <Link
          href="/lps/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
        >
          Add LP
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
          Error loading LPs: {error.message}
        </div>
      )}

      {!lps || lps.length === 0 ? (
        <div className="bg-muted p-8 rounded-lg text-center">
          <p className="text-muted-foreground mb-4">
            No LP contacts yet. LPs are automatically created when emails are parsed, or you can add them manually.
          </p>
          <Link
            href="/lps/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition inline-block"
          >
            Add LP Manually
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Firm</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Total Committed</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lps.map((lp) => (
                <tr key={lp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/lps/${lp.id}`} className="font-medium text-sm hover:text-primary">
                      {lp.name}
                    </Link>
                    {lp.title && (
                      <p className="text-xs text-muted-foreground">{lp.title}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {lp.firm || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {lp.email}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">
                    {formatCurrency(lp.total_commitments)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {lp.last_interaction_at
                      ? formatDistanceToNow(new Date(lp.last_interaction_at), { addSuffix: true })
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
