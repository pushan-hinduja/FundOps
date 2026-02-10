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
  "has_wire_details": boolean,
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
10. Set has_wire_details to true if the email contains wire transfer information (bank details, routing numbers, account numbers, wire confirmation, transfer reference numbers, SWIFT codes, etc.)

Now analyze the email and return JSON:`;
}

export type ResponseTone = "professional" | "friendly" | "formal" | "concise";

export interface EmailResponseContext {
  // Original email details
  originalEmail: {
    fromEmail: string;
    fromName: string | null;
    subject: string | null;
    bodyText: string | null;
    question: string;
  };
  // Deal context
  deal: {
    name: string;
    companyName: string | null;
    targetRaise: number | null;
    minCheckSize: number | null;
    maxCheckSize: number | null;
    feePercent: number | null;
    carryPercent: number | null;
    deadline: string | null;
    description: string | null;
  };
  // LP-specific context (if available)
  lpTerms?: {
    committedAmount: number | null;
    allocatedAmount: number | null;
    specialFeePercent: number | null;
    specialCarryPercent: number | null;
    sideLetterTerms: string | null;
    hasMfnRights: boolean;
    hasCoinvestRights: boolean;
  };
  // User's name for signing
  senderName: string;
  // Tone preference
  tone: ResponseTone;
}

const TONE_INSTRUCTIONS: Record<ResponseTone, string> = {
  professional: "Write in a professional, business-appropriate tone. Be clear, respectful, and thorough while maintaining a warm but not overly casual style.",
  friendly: "Write in a warm, approachable tone. Be personable and conversational while still maintaining professionalism. Use a slightly more casual style.",
  formal: "Write in a formal, traditional business tone. Use proper salutations and closings. Be precise and respectful, avoiding casual language.",
  concise: "Write in a brief, direct tone. Get to the point quickly while remaining polite. Use short sentences and bullet points where appropriate.",
};

export function buildEmailResponsePrompt(context: EmailResponseContext): string {
  const { originalEmail, deal, lpTerms, senderName, tone } = context;

  // Format currency helper
  const formatCurrency = (amount: number | null) => {
    if (!amount) return "not specified";
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  // Build deal terms section
  let dealTermsSection = `DEAL INFORMATION:
- Deal Name: ${deal.name}
- Company: ${deal.companyName || "Not specified"}
- Target Raise: ${formatCurrency(deal.targetRaise)}
- Check Size Range: ${formatCurrency(deal.minCheckSize)} - ${formatCurrency(deal.maxCheckSize)}
- Management Fee: ${deal.feePercent ? `${deal.feePercent}%` : "Not specified"}
- Carry: ${deal.carryPercent ? `${deal.carryPercent}%` : "Not specified"}
- Deadline: ${deal.deadline ? new Date(deal.deadline).toLocaleDateString() : "Not specified"}`;

  if (deal.description) {
    dealTermsSection += `\n- Description: ${deal.description}`;
  }

  // Build LP-specific terms section if available
  let lpTermsSection = "";
  if (lpTerms) {
    lpTermsSection = `

LP-SPECIFIC TERMS FOR THIS INVESTOR:
- Committed Amount: ${formatCurrency(lpTerms.committedAmount)}
- Allocated Amount: ${formatCurrency(lpTerms.allocatedAmount)}
- Special Management Fee: ${lpTerms.specialFeePercent !== null ? `${lpTerms.specialFeePercent}%` : "Standard terms"}
- Special Carry: ${lpTerms.specialCarryPercent !== null ? `${lpTerms.specialCarryPercent}%` : "Standard terms"}
- MFN Rights: ${lpTerms.hasMfnRights ? "Yes" : "No"}
- Co-invest Rights: ${lpTerms.hasCoinvestRights ? "Yes" : "No"}`;

    if (lpTerms.sideLetterTerms) {
      lpTermsSection += `\n- Side Letter Terms: ${lpTerms.sideLetterTerms}`;
    }
  }

  return `You are an AI assistant helping a fund manager respond to investor (LP) questions about a venture capital deal.

${dealTermsSection}${lpTermsSection}

ORIGINAL EMAIL CONTEXT:
---
From: ${originalEmail.fromName || originalEmail.fromEmail} <${originalEmail.fromEmail}>
Subject: ${originalEmail.subject || "(no subject)"}
Body:
"""
${originalEmail.bodyText || "(empty body)"}
"""
---

SPECIFIC QUESTION TO ADDRESS:
"${originalEmail.question}"

RESPONSE TONE:
${TONE_INSTRUCTIONS[tone]}

INSTRUCTIONS:
1. Write a response that directly addresses the investor's question
2. Use the deal terms and LP-specific terms (if available) to provide accurate information
3. If the question asks about something not covered in the provided context, acknowledge this and offer to follow up
4. Be helpful and informative without over-promising or making commitments the fund manager hasn't authorized
5. Do NOT include a subject line - just write the email body
6. End with an appropriate sign-off using the name: ${senderName}
7. Keep the response focused and relevant to the question asked

Write the email response now:`;
}
