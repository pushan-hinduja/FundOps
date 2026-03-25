import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User } from "lucide-react";
import { ProfileDetails } from "@/components/settings/ProfileDetails";

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

  return (
    <div className="px-8 py-6">
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
        <div className="glass-card rounded-2xl p-6">
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
      </div>
    </div>
  );
}
