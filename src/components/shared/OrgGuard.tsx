import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NoOrganization } from "./NoOrganization";

export async function OrgGuard({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <>{children}</>;

  const serviceClient = createServiceClient();

  const { data: userData } = await serviceClient
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return <NoOrganization />;
  }

  return <>{children}</>;
}
