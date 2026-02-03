import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Building2, Mail, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

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
    <div className="px-8 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and organization preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Profile</h2>
              <p className="text-sm text-muted-foreground">Your personal information</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="font-medium">{userData?.name || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{userData?.role || "Member"}</span>
            </div>
          </div>
        </div>

        {/* Organization Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Organization</h2>
              <p className="text-sm text-muted-foreground">Your team settings</p>
            </div>
          </div>
          {userData?.organizations ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="font-medium">{userData.organizations.name}</span>
              </div>
              {userData.organizations.domain && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">Domain</span>
                  <span className="font-medium">{userData.organizations.domain}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t joined an organization yet.
              </p>
              <Link
                href="/settings/organization/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create Organization
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Email Integration Section */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Email Integration</h2>
              <p className="text-sm text-muted-foreground">Connect your email accounts</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-4">
            Connect your Gmail account to automatically ingest LP emails and sync your communications.
          </p>
          <Link
            href="/settings/email"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Manage Email Accounts
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
