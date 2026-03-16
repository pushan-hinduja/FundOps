import { SupabaseClient } from "@supabase/supabase-js";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export interface ToolContext {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
}

export type ToolExecutor = (
  input: Record<string, unknown>,
  ctx: ToolContext
) => Promise<string>;

export interface ToolRegistryEntry {
  definition: Tool;
  execute: ToolExecutor;
}
