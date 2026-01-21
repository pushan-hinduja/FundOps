import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DealsPage() {
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
        <h1 className="text-2xl font-bold mb-4">Deals</h1>
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

  // Fetch deals
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", userData.organization_id)
    .order("created_at", { ascending: false });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "closed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <Link
          href="/deals/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
        >
          New Deal
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
          Error loading deals: {error.message}
        </div>
      )}

      {!deals || deals.length === 0 ? (
        <div className="bg-muted p-8 rounded-lg text-center">
          <p className="text-muted-foreground mb-4">
            No deals yet. Create your first deal to start tracking LP responses.
          </p>
          <Link
            href="/deals/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition inline-block"
          >
            Create Deal
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{deal.name}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deal.status)}`}
                >
                  {deal.status}
                </span>
              </div>

              {deal.company_name && (
                <p className="text-sm text-muted-foreground mb-4">{deal.company_name}</p>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium">{formatCurrency(deal.target_raise)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Committed</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(deal.total_committed)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interested</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(deal.total_interested)}
                  </span>
                </div>
              </div>

              {deal.target_raise && deal.target_raise > 0 && (
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((deal.total_committed || 0) / deal.target_raise) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(((deal.total_committed || 0) / deal.target_raise) * 100)}% committed
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
