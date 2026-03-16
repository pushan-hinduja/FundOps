import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateInsights } from "@/lib/ai/memory/insights";

// POST /api/cron/generate-insights — generate proactive insights for all orgs
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== "Bearer " + cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get all active organizations
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name");

    if (orgsError) {
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    let totalInsights = 0;

    for (const org of orgs || []) {
      try {
        const count = await generateInsights({
          supabase,
          organizationId: org.id,
        });
        totalInsights += count;
        if (count > 0) {
          console.log(
            "[Insights] Generated " + count + " insight(s) for " + org.name
          );
        }
      } catch (err) {
        console.error(
          "[Insights] Error generating insights for " + org.name + ":",
          err
        );
      }
    }

    return NextResponse.json({
      success: true,
      organizations_processed: orgs?.length || 0,
      insights_created: totalInsights,
    });
  } catch (error) {
    console.error("Generate insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
