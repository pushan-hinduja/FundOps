import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolRegistryEntry } from "./types";

import { queryLpsDefinition, executeQueryLps } from "./query-lps";
import { getDealPipelineDefinition, executeGetDealPipeline } from "./get-deal-pipeline";
import { getCommitmentStatusDefinition, executeGetCommitmentStatus } from "./get-commitment-status";
import { getEmailHistoryDefinition, executeGetEmailHistory } from "./get-email-history";
import { getEngagementScoresDefinition, executeGetEngagementScores } from "./get-engagement-scores";
import { getDealAnalyticsDefinition, executeGetDealAnalytics } from "./get-deal-analytics";
import { getWireStatusDefinition, executeGetWireStatus } from "./get-wire-status";
import { getInvestorUpdatesDefinition, executeGetInvestorUpdates } from "./get-investor-updates";
import { searchAcrossAllDefinition, executeSearchAcrossAll } from "./search-across-all";
import { draftEmailDefinition, executeDraftEmail } from "./draft-email";
import { rememberDefinition, executeRemember } from "./remember";

const TOOL_MAP: Record<string, ToolRegistryEntry> = {
  query_lps: { definition: queryLpsDefinition, execute: executeQueryLps },
  get_deal_pipeline: { definition: getDealPipelineDefinition, execute: executeGetDealPipeline },
  get_commitment_status: { definition: getCommitmentStatusDefinition, execute: executeGetCommitmentStatus },
  get_email_history: { definition: getEmailHistoryDefinition, execute: executeGetEmailHistory },
  get_engagement_scores: { definition: getEngagementScoresDefinition, execute: executeGetEngagementScores },
  get_deal_analytics: { definition: getDealAnalyticsDefinition, execute: executeGetDealAnalytics },
  get_wire_status: { definition: getWireStatusDefinition, execute: executeGetWireStatus },
  get_investor_updates: { definition: getInvestorUpdatesDefinition, execute: executeGetInvestorUpdates },
  search_across_all: { definition: searchAcrossAllDefinition, execute: executeSearchAcrossAll },
  draft_email: { definition: draftEmailDefinition, execute: executeDraftEmail },
  remember: { definition: rememberDefinition, execute: executeRemember },
};

export const TOOL_DEFINITIONS: Tool[] = Object.values(TOOL_MAP).map(
  (entry) => entry.definition
);

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  const tool = TOOL_MAP[name];
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }

  const startTime = Date.now();
  try {
    const result = await tool.execute(input, ctx);
    const duration = Date.now() - startTime;
    console.log(
      `[Agent] Tool call: ${name} | Duration: ${duration}ms | Result size: ${(result.length / 1024).toFixed(1)}KB`
    );
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[Agent] Tool error: ${name} | Duration: ${duration}ms | Error: ${errorMsg}`
    );
    return JSON.stringify({ error: errorMsg });
  }
}
