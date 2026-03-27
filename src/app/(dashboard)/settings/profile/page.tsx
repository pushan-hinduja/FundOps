import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, AlertTriangle } from "lucide-react";
import { ProfileDetails } from "@/components/settings/ProfileDetails";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = createServiceClient();
  const { data: userData } = await serviceClient
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single();

  // Find organizations where this user is the sole member
  const { data: memberships } = await serviceClient
    .from("user_organizations")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id);

  const soleOrgNames: string[] = [];
  if (memberships) {
    for (const m of memberships) {
      const { count } = await serviceClient
        .from("user_organizations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", m.organization_id);
      if (count === 1) {
        soleOrgNames.push((m.organizations as any)?.name ?? "Unknown");
      }
    }
  }

  return (
    <div className="px-4 md:px-8 py-6">
      <div className="mb-6">
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-2xl font-medium mt-2">Manage Profile</h1>
      </div>

      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Profile Details</h2>
              <p className="text-sm text-muted-foreground">
                Your personal information
              </p>
            </div>
          </div>
          <ProfileDetails
            name={userData?.name || ""}
            email={userData?.email || user.email || ""}
          />
        </div>

        {/* Danger Zone */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-destructive/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Delete My Account</h2>
              <p className="text-sm text-muted-foreground">
                Irreversible actions for your account
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting your account will permanently remove all your data and cannot be undone.
          </p>
          <DeleteAccountButton soleOrgNames={soleOrgNames} />
        </div>
      </div>
    </div>
  );
}
