import type { LPContext, DealContext } from "./types";

export function buildParsingPrompt(
  email: {
    from_email: string;
    from_name: string | null;
    subject: string | null;
    body_text: string | null;
    received_at: string;
  },
  lps: LPContext[],
  deals: DealContext[]
): string {
  const lpsList = lps.length > 0
    ? lps.map(lp => `- ${lp.name} (${lp.email})${lp.firm ? ` - ${lp.firm}` : ""} [ID: ${lp.id}]`).join("\n")
    : "No LPs in database yet";

  const dealsList = deals.length > 0
    ? deals.map(d => `- ${d.name}${d.company_name ? ` (${d.company_name})` : ""} [${d.status}] [ID: ${d.id}]`).join("\n")
    : "No deals in database yet";

  return `You are an AI assistant analyzing venture capital LP (Limited Partner) communications for a fund manager CRM system.

Your task is to extract structured information from the email below and return ONLY valid JSON.

## Context
The fund manager receives emails from LPs (investors) regarding deal opportunities. You need to identify:
1. Who the LP is (person and firm)
2. Which deal they're discussing (if any)
3. Their intent (interested, committed, declined, asking questions, or neutral)
4. Any commitment amount mentioned
5. The overall sentiment

## Known Deals (match against these if applicable)
${dealsList}

## Known LPs (match against these if applicable)
${lpsList}

## Email Content
---
From: ${email.from_email}
From Name: ${email.from_name || "Unknown"}
Subject: ${email.subject || "(no subject)"}
Date: ${email.received_at}
Body:
"""
${email.body_text || "(empty body)"}
"""
---

## Output Format
Return ONLY this JSON structure, no other text:

{
  "lp": {
    "name": "string or null",
    "firm": "string or null",
    "email": "string or null",
    "matched_lp_id": "uuid or null (from Known LPs list above)"
  },
  "deal": {
    "name": "string or null",
    "matched_deal_id": "uuid or null (from Known Deals list above)"
  },
  "intent": "interested | committed | declined | question",
  "commitment_amount": number or null,
  "sentiment": "positive | neutral | negative | urgent",
  "questions": ["array of specific questions the LP is asking"],
  "confidence": {
    "lp": 0.0-1.0,
    "deal": 0.0-1.0,
    "intent": 0.0-1.0,
    "amount": 0.0-1.0
  },
  "reasoning": "Brief explanation of your analysis"
}

## Rules
1. If you cannot determine a field with confidence, use null and set low confidence (0.0-0.3)
2. For amounts, extract the number in USD (convert "500K" to 500000, "$1M" to 1000000)
3. Intent definitions:
   - "interested" = positive signal but not explicitly committed
   - "committed" = explicit commitment to invest
   - "declined" = explicit pass or not interested
   - "question" = primarily asking questions without clear commitment
4. Match LPs by email first, then by name/firm
5. Match deals by name, allowing for variations ("Acme Series B" = "Acme deal" = "the Acme opportunity")
6. If an LP or deal is not in the known lists, return null for matched_*_id but still extract the name/firm
7. If email is an auto-reply, out-of-office message, or system notification, skip it entirely - return null for all fields except confidence scores set to 0
8. Extract any direct questions the LP is asking about the deal, investment terms, timeline, or process
9. Questions should be verbatim or minimally paraphrased for clarity - use empty array if no questions are asked

Now analyze the email and return JSON:`;
}
