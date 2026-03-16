import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, AGENT_MODEL_ID } from "@/lib/ai/anthropic";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/tools/types";

const MAX_TOOL_ITERATIONS = 10;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, conversationHistory = [] } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get Supabase client and user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get org name for system prompt
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", userData.organization_id)
      .single();

    const orgName = orgData?.name || "your organization";

    // Build tool context
    const toolContext: ToolContext = {
      supabase,
      organizationId: userData.organization_id,
      userId: user.id,
    };

    // Build messages
    const client = getAnthropicClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    // Add conversation history
    for (const msg of conversationHistory as Message[]) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current query
    messages.push({
      role: "user",
      content: query,
    });

    const systemPrompt = `You are an AI assistant for FundOps, a fund operations platform for ${orgName}. You help fund managers understand their deals, LP (Limited Partner) contacts, pipeline data, email communications, and investor relationships.

You have access to tools that query the database. ALWAYS use tools to get current data — do not guess or make up numbers. If a question requires data you don't have, use the appropriate tool to fetch it.

Tool usage guidelines:
- Use search_across_all for vague or broad questions where the entity type is unclear
- Use query_lps to find and filter LP contacts
- Use get_deal_pipeline for deal details and LP breakdowns
- Use get_commitment_status for detailed commitment/wire/terms information
- Use get_email_history for recent email interactions
- Use get_engagement_scores to identify engagement patterns and silent/at-risk LPs
- Use get_deal_analytics for aggregate metrics, funnels, and close readiness
- Use get_wire_status for wire transfer tracking
- Use get_investor_updates for investor update history
- Use draft_email to compose outbound emails (always confirm with the user before drafting)
- Chain multiple tools when needed for comprehensive answers

Formatting guidelines:
- Format currency nicely (e.g., $1.5M instead of 1500000)
- Use markdown bold for emphasis
- Be conversational but professional
- Keep responses concise — lead with the answer, then provide supporting details
- When listing multiple items, use bullet points or tables`;

    // Agent loop: call Claude with tools, execute tool calls, repeat
    let iterations = 0;
    const toolCallLog: { name: string; duration_ms: number }[] = [];

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model: AGENT_MODEL_ID,
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS,
        messages,
      });

      // Check if the response has tool_use blocks
      const toolUseBlocks = response.content.filter(
        (block) => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
        // Final response — extract text
        const textContent = response.content.find(
          (block) => block.type === "text"
        );
        const aiResponse = textContent
          ? (textContent as { type: "text"; text: string }).text
          : "I couldn't generate a response. Please try rephrasing your question.";

        return NextResponse.json({
          response: aiResponse,
          toolCalls: toolCallLog,
        });
      }

      // Append assistant message with tool_use blocks
      messages.push({
        role: "assistant",
        content: response.content,
      });

      // Execute each tool call and build tool_result messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults: any[] = [];

      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;

        const startTime = Date.now();
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          toolContext
        );
        const duration = Date.now() - startTime;

        toolCallLog.push({ name: block.name, duration_ms: duration });

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      // Append tool results as a user message
      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    // If we hit max iterations, extract whatever text we have
    return NextResponse.json({
      response:
        "I performed multiple queries but couldn't fully resolve your question. Could you try being more specific?",
      toolCalls: toolCallLog,
    });
  } catch (error) {
    console.error("AI Search error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
