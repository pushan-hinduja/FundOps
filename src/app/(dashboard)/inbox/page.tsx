import { createClient } from "@/lib/supabase/server";
import { IntentBadge } from "@/components/shared/IntentBadge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
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
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <div className="bg-muted p-8 rounded-lg text-center">
          <p className="text-muted-foreground">
            You haven&apos;t set up your organization yet.
          </p>
          <Link href="/settings" className="text-primary hover:underline mt-2 inline-block">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // Fetch emails with parsed data
  const { data: emails, error } = await supabase
    .from("emails_raw")
    .select(`
      id,
      from_email,
      from_name,
      subject,
      received_at,
      emails_parsed (
        intent,
        detected_lp_id,
        detected_deal_id,
        confidence_scores,
        lp_contacts (name, firm),
        deals (name)
      )
    `)
    .eq("organization_id", userData.organization_id)
    .order("received_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <Link
          href="/settings/email"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition"
        >
          Connect Gmail
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
          Error loading emails: {error.message}
        </div>
      )}

      {!emails || emails.length === 0 ? (
        <div className="bg-muted p-8 rounded-lg text-center">
          <p className="text-muted-foreground">
            No emails yet. Connect your Gmail account to start ingesting emails.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">From</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Intent</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">LP</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Deal</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {emails.map((email: any) => {
                const parsed = email.emails_parsed?.[0];
                return (
                  <tr key={email.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{email.from_name || email.from_email}</div>
                      <div className="text-xs text-muted-foreground">{email.from_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/inbox/${email.id}`} className="text-sm hover:text-primary">
                        {email.subject || "(no subject)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <IntentBadge intent={parsed?.intent} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {parsed?.lp_contacts?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {parsed?.deals?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
