import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user settings
    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching user settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Return settings or empty object if none exist
    return NextResponse.json({
      settings: settings?.settings || {},
    });
  } catch (error) {
    console.error("User settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { settings } = await request.json();

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Settings object is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing settings
    const { data: existing } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .single();

    // Merge new settings with existing
    const mergedSettings = {
      ...(existing?.settings || {}),
      ...settings,
    };

    // Upsert settings (insert or update)
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          settings: mergedSettings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select("settings")
      .single();

    if (error) {
      console.error("Error updating user settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: data?.settings || mergedSettings,
    });
  } catch (error) {
    console.error("User settings PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
