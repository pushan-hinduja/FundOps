import { google, gmail_v1, Common } from "googleapis";
import { getOAuth2Client, refreshAccessToken } from "./oauth";
import { decrypt, encrypt } from "../utils/encryption";
import { createServiceClient } from "../supabase/server";
import type { AuthAccount } from "../supabase/types";

export interface GmailMessage {
  id: string;
  threadId: string;
  from: { email: string; name: string | null };
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  hasAttachments: boolean;
}

export async function getGmailClient(authAccount: AuthAccount) {
  const oauth2Client = getOAuth2Client();

  // Check if token needs refresh
  const expiresAt = new Date(authAccount.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  let accessToken = decrypt(authAccount.access_token);
  let tokenRefreshed = false;

  if (expiresAt < fiveMinutesFromNow) {
    // Refresh the token
    console.log("[Gmail Client] Token expired or expiring soon, refreshing...");
    const refreshToken = decrypt(authAccount.refresh_token);
    const newTokens = await refreshAccessToken(refreshToken);
    accessToken = newTokens.accessToken;
    tokenRefreshed = true;

    // Update the database with new token
    const supabase = createServiceClient();
    await supabase
      .from("auth_accounts")
      .update({
        access_token: encrypt(newTokens.accessToken),
        token_expires_at: newTokens.expiresAt.toISOString(),
      })
      .eq("id", authAccount.id);
    console.log("[Gmail Client] Token refreshed and saved");
  }

  console.log(`[Gmail Client] Using ${tokenRefreshed ? "refreshed" : "existing"} token for ${authAccount.email}`);

  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function fetchNewMessages(
  gmail: gmail_v1.Gmail,
  afterTimestamp?: Date,
  maxResults: number = 500
): Promise<gmail_v1.Schema$Message[]> {
  // Build query - fetch all inbox messages, not filtered by date
  // This ensures we get emails even if timestamp is off
  const query = "in:inbox";

  console.log(`[Gmail API] Fetching messages with query: "${query}", maxResults: ${maxResults}`);

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];
    console.log(`[Gmail API] Response: ${messages.length} messages found, resultSizeEstimate: ${response.data.resultSizeEstimate}`);

    return messages;
  } catch (error: any) {
    console.error(`[Gmail API] Error fetching messages:`, error.message);
    if (error.response) {
      console.error(`[Gmail API] Response status: ${error.response.status}`);
      console.error(`[Gmail API] Response data:`, JSON.stringify(error.response.data));
    }
    throw error;
  }
}

/**
 * Fetch only UNREAD messages from inbox
 * Use this for regular sync operations (more efficient than fetching all)
 */
export async function fetchUnreadMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> {
  const query = "in:inbox is:unread";
  const allMessages: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined = undefined;

  console.log(`[Gmail API] Fetching UNREAD messages with query: "${query}"`);

  try {
    let hasMore = true;
    while (hasMore) {
      const listResponse: Common.GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 500,
        pageToken,
      });

      const messages = listResponse.data.messages || [];
      allMessages.push(...messages);
      pageToken = listResponse.data.nextPageToken || undefined;
      hasMore = !!pageToken;

      console.log(`[Gmail API] Fetched ${messages.length} unread messages (total: ${allMessages.length}), nextPageToken: ${pageToken ? 'yes' : 'no'}`);
    }

    console.log(`[Gmail API] Complete! Total unread messages fetched: ${allMessages.length}`);
    return allMessages;
  } catch (error: any) {
    console.error(`[Gmail API] Error fetching unread messages:`, error.message);
    throw error;
  }
}

/**
 * Fetch ALL messages from inbox using pagination
 * Use this for backfill operations
 */
export async function fetchAllMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> {
  const query = "in:inbox";
  const allMessages: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined = undefined;

  console.log(`[Gmail API] Fetching ALL messages with query: "${query}"`);

  try {
    let hasMore = true;
    while (hasMore) {
      const listResponse: Common.GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 500, // Max allowed per request
        pageToken,
      });

      const messages = listResponse.data.messages || [];
      allMessages.push(...messages);
      pageToken = listResponse.data.nextPageToken || undefined;
      hasMore = !!pageToken;

      console.log(`[Gmail API] Fetched ${messages.length} messages (total: ${allMessages.length}), nextPageToken: ${pageToken ? 'yes' : 'no'}`);
    }

    console.log(`[Gmail API] Complete! Total messages fetched: ${allMessages.length}`);
    return allMessages;
  } catch (error: any) {
    console.error(`[Gmail API] Error fetching all messages:`, error.message);
    throw error;
  }
}

export async function getMessageDetails(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<GmailMessage> {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const message = response.data;
  const headers = message.payload?.headers || [];

  // Extract headers
  const getHeader = (name: string): string => {
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || "";
  };

  // Parse From header
  const fromHeader = getHeader("From");
  const fromMatch = fromHeader.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  const from = {
    email: fromMatch ? fromMatch[2] : fromHeader,
    name: fromMatch ? fromMatch[1] || null : null,
  };

  // Parse To header
  const toHeader = getHeader("To");
  const to = toHeader.split(",").map((addr) => {
    const match = addr.match(/<([^>]+)>/);
    return match ? match[1].trim() : addr.trim();
  }).filter(Boolean);

  // Parse CC header
  const ccHeader = getHeader("Cc");
  const cc = ccHeader ? ccHeader.split(",").map((addr) => {
    const match = addr.match(/<([^>]+)>/);
    return match ? match[1].trim() : addr.trim();
  }).filter(Boolean) : [];

  // Extract body
  const { text, html } = extractBody(message.payload);

  // Check for attachments
  const hasAttachments = hasMessageAttachments(message.payload);

  // Parse date
  const dateHeader = getHeader("Date");
  const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

  return {
    id: message.id!,
    threadId: message.threadId!,
    from,
    to,
    cc,
    subject: getHeader("Subject"),
    bodyText: text,
    bodyHtml: html,
    receivedAt,
    hasAttachments,
  };
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): { text: string; html: string } {
  let text = "";
  let html = "";

  if (!payload) {
    return { text, html };
  }

  // If the payload has a body with data, decode it
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64").toString("utf8");
    if (payload.mimeType === "text/plain") {
      text = decoded;
    } else if (payload.mimeType === "text/html") {
      html = decoded;
    }
  }

  // Recursively process parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const partBody = extractBody(part);
      if (partBody.text && !text) text = partBody.text;
      if (partBody.html && !html) html = partBody.html;
    }
  }

  return { text, html };
}

function hasMessageAttachments(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false;

  if (payload.filename && payload.filename.length > 0) {
    return true;
  }

  if (payload.parts) {
    return payload.parts.some((part) => hasMessageAttachments(part));
  }

  return false;
}
