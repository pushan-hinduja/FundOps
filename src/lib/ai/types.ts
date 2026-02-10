import { z } from "zod";

// Zod schema for AI parsing response validation
export const ParsedEmailSchema = z.object({
  lp: z.object({
    name: z.string().nullable(),
    firm: z.string().nullable(),
    email: z.string().nullable(),
    matched_lp_id: z.string().uuid().nullable(),
  }),
  deal: z.object({
    name: z.string().nullable(),
    matched_deal_id: z.string().uuid().nullable(),
  }),
  intent: z.enum(["interested", "committed", "declined", "question"]).nullable(),
  commitment_amount: z.number().nullable(),
  sentiment: z.enum(["positive", "neutral", "negative", "urgent"]).nullable(),
  questions: z.array(z.string()),
  has_wire_details: z.boolean(),
  confidence: z.object({
    lp: z.number().min(0).max(1),
    deal: z.number().min(0).max(1),
    intent: z.number().min(0).max(1),
    amount: z.number().min(0).max(1),
  }),
  reasoning: z.string(),
});

export type ParsedEmail = z.infer<typeof ParsedEmailSchema>;

export interface LPContext {
  id: string;
  name: string;
  email: string;
  firm: string | null;
}

export interface DealContext {
  id: string;
  name: string;
  company_name: string | null;
  status: string;
}
