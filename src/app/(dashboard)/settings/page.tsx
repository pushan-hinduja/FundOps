import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Building2, Link2, ArrowRight } from "lucide-react";
import { AIResponseSettings } from "@/components/settings/AIResponseSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use service client for user profile — users without org can't SELECT themselves
  const serviceClient = createServiceClient();

  // Get user profile with org join
  const { data: userData } = await serviceClient
    .from("users")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  // Get role from user_organizations (source of truth)
  let userRole = "member";
  if (userData?.organization_id) {
    const { data: membership } = await serviceClient
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", userData.organization_id)
      .single();
    userRole = membership?.role || "member";
  }

  const hasOrg = !!userData?.organization_id;

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        {!hasOrg && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            &larr; Back
          </Link>
        )}
        <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          {hasOrg ? "Manage your account and organization preferences" : "Manage your account"}
        </p>
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
            <div className="pt-2">
              <Link
                href="/settings/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Manage Profile
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {hasOrg && (
          <>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="font-medium">{userData.organizations?.name}</span>
                </div>
                {userData.organizations?.domain && (
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Domain</span>
                    <span className="font-medium">{userData.organizations.domain}</span>
                  </div>
                )}
                {userRole === "admin" && (
                  <div className="pt-2">
                    <Link
                      href="/settings/organization"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      Manage Organization
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Integrations Section */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-medium">Integrations</h2>
                  <p className="text-sm text-muted-foreground">Connect email and messaging accounts</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Connect Gmail and WhatsApp to automatically ingest communications and sync with your LP and deal data.
              </p>
              <Link
                href="/settings/email"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Manage Integrations
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* AI Response Settings */}
            <AIResponseSettings />
          </>
        )}
      </div>
    </div>
  );
}
