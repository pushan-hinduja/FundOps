import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user profile
  const { data: userData } = await supabase
    .from("users")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Name</label>
              <p className="font-medium">{userData?.name || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Role</label>
              <p className="font-medium capitalize">{userData?.role || "Member"}</p>
            </div>
          </div>
        </div>

        {/* Organization Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Organization</h2>
          {userData?.organizations ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="font-medium">{userData.organizations.name}</p>
              </div>
              {userData.organizations.domain && (
                <div>
                  <label className="text-sm text-muted-foreground">Domain</label>
                  <p className="font-medium">{userData.organizations.domain}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-3">
                You haven&apos;t joined an organization yet.
              </p>
              <Link
                href="/settings/organization/new"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition inline-block"
              >
                Create Organization
              </Link>
            </div>
          )}
        </div>

        {/* Email Integration Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Email Integration</h2>
          <p className="text-muted-foreground mb-4">
            Connect your Gmail account to automatically ingest LP emails.
          </p>
          <Link
            href="/settings/email"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition inline-block"
          >
            Manage Email Accounts
          </Link>
        </div>
      </div>
    </div>
  );
}
