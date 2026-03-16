import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/ai/agent/executor";
import type { ToolContext } from "@/lib/ai/tools/types";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get org name
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", userData.organization_id)
      .single();

    const orgName = orgData?.name || "your organization";

    const toolContext: ToolContext = {
      supabase,
      organizationId: userData.organization_id,
      userId: user.id,
    };

    // Run the agent and return an SSE stream
    const stream = runAgent({
      userMessage: message,
      conversationHistory,
      toolContext,
      orgName,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
