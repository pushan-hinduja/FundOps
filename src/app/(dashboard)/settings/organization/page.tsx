import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { OrganizationMembers } from "@/components/settings/OrganizationMembers";
import { OrganizationDetails } from "@/components/settings/OrganizationDetails";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  if (!userData?.organizations) {
    redirect("/settings");
  }

  // Get role from user_organizations (source of truth)
  const { data: membership } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (membership?.role !== "admin") {
    redirect("/settings");
  }

  const org = userData.organizations;

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="text-2xl font-medium mt-2">Manage Organization</h1>
      </div>

      <div className="space-y-6">
        {/* Org Details */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Organization Details</h2>
              <p className="text-sm text-muted-foreground">
                Your organization information
              </p>
            </div>
          </div>
          <OrganizationDetails id={org.id} name={org.name} domain={org.domain} />
        </div>

        {/* Members */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Members</h2>
              <p className="text-sm text-muted-foreground">
                People in your organization
              </p>
            </div>
          </div>
          <OrganizationMembers />
        </div>
      </div>
    </div>
  );
}
