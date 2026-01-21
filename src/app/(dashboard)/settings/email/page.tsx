import { createClient } from "@/lib/supabase/server";
import { DisconnectGmailButton } from "@/components/shared/DisconnectGmailButton";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch connected accounts
  const { data: accounts } = await supabase
    .from("auth_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "gmail");

  const successMessage =
    searchParams.success === "gmail_connected"
      ? "Gmail account connected successfully!"
      : null;

  const errorMessages: Record<string, string> = {
    oauth_denied: "Gmail authorization was denied.",
    no_code: "No authorization code received.",
    invalid_state: "Invalid state parameter. Please try again.",
    not_authenticated: "You must be logged in to connect Gmail.",
    save_failed: "Failed to save Gmail credentials.",
    token_exchange_failed: "Failed to exchange authorization code.",
    oauth_config_missing:
      "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the server.",
    missing_encryption_key:
      "Token encryption is not configured. Set ENCRYPTION_KEY and restart the server.",
  };

  const errorMessage = searchParams.error
    ? errorMessages[searchParams.error] || "An error occurred."
    : null;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-bold mt-2">Email Accounts</h1>
      </div>

      {successMessage && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold">Connected Gmail Accounts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Emails from these accounts will be automatically ingested and parsed.
            </p>
          </div>
          <Link
            href="/api/auth/google"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
          >
            Connect Gmail
          </Link>
        </div>

        {!accounts || accounts.length === 0 ? (
          <div className="bg-muted p-6 rounded-lg text-center">
            <p className="text-muted-foreground">
              No Gmail accounts connected yet. Click &quot;Connect Gmail&quot; to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium">{account.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.last_sync_at
                      ? `Last synced ${formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}`
                      : "Never synced"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      account.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {account.is_active ? "Active" : "Inactive"}
                  </span>
                  <DisconnectGmailButton accountId={account.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-muted/50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">How it works</h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Connect your Gmail account by clicking &quot;Connect Gmail&quot;</li>
          <li>Authorize FundOps to read your emails (we only read, never send)</li>
          <li>Click &quot;Sync Emails&quot; on the LPs or Deals page to pull emails</li>
          <li>Our AI parses each email to identify LPs, deals, and intent</li>
          <li>Suggested contacts appear automatically from your emails</li>
        </ol>
      </div>
    </div>
  );
}
