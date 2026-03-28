import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const serviceClient = createServiceClient();
        const metadata = user.user_metadata || {};
        const fullName = metadata.full_name || null;
        const orgName = metadata.org_name || null;

        // Ensure the users row exists (upsert to handle both new and returning users)
        await serviceClient
          .from("users")
          .upsert(
            {
              id: user.id,
              email: user.email!,
              name: fullName,
            },
            { onConflict: "id", ignoreDuplicates: false }
          );

        // If user specified an org name during signup, create it
        if (orgName) {
          // Check if user already has an org (returning user clicking link again)
          const { data: existingUser } = await serviceClient
            .from("users")
            .select("organization_id")
            .eq("id", user.id)
            .single();

          if (!existingUser?.organization_id) {
            const { data: org } = await serviceClient
              .from("organizations")
              .insert({ name: orgName })
              .select()
              .single();

            if (org) {
              await serviceClient
                .from("users")
                .update({ organization_id: org.id })
                .eq("id", user.id);

              await serviceClient
                .from("user_organizations")
                .upsert(
                  { user_id: user.id, organization_id: org.id, role: "admin" },
                  { onConflict: "user_id,organization_id" }
                );
            }
          }
        }

        // Process any pending organization invites for this email
        const { data: pendingInvites } = await serviceClient
          .from("organization_invites")
          .select("id, organization_id, role")
          .eq("email", user.email!)
          .eq("status", "pending");

        if (pendingInvites && pendingInvites.length > 0) {
          for (const invite of pendingInvites) {
            // Add user to the invited organization
            await serviceClient
              .from("user_organizations")
              .upsert(
                {
                  user_id: user.id,
                  organization_id: invite.organization_id,
                  role: invite.role,
                },
                { onConflict: "user_id,organization_id" }
              );

            // Mark invite as accepted
            await serviceClient
              .from("organization_invites")
              .update({
                status: "accepted",
                accepted_at: new Date().toISOString(),
              })
              .eq("id", invite.id);
          }

          // If user has no active org, set the first invited org as active
          const { data: currentUser } = await serviceClient
            .from("users")
            .select("organization_id")
            .eq("id", user.id)
            .single();

          if (!currentUser?.organization_id) {
            await serviceClient
              .from("users")
              .update({ organization_id: pendingInvites[0].organization_id })
              .eq("id", user.id);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with a type-specific message
  const type = next === "/reset-password" ? "reset_password" : "confirm_email";
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error&type=${type}`);
}
