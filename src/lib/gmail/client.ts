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

/**
 * Get the current historyId from Gmail profile.
 * Used to seed sync_cursor on first sync.
 */
export async function getCurrentHistoryId(
  gmail: gmail_v1.Gmail
): Promise<string> {
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.historyId!;
}

/**
 * Fetch new message IDs since a given historyId using Gmail's History API.
 * Returns only messages that were added to the inbox since the last sync.
 * Throws with code 404 if the historyId is too old / expired.
 */
export async function fetchMessagesSinceHistory(
  gmail: gmail_v1.Gmail,
  startHistoryId: string
): Promise<{ messageIds: string[]; newHistoryId: string }> {
  const messageIds: string[] = [];
  let pageToken: string | undefined = undefined;
  let latestHistoryId = startHistoryId;

  console.log(`[Gmail API] Fetching history since historyId: ${startHistoryId}`);

  try {
    let hasMore = true;
    while (hasMore) {
      const response: Common.GaxiosResponse<gmail_v1.Schema$ListHistoryResponse> = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        pageToken,
      });

      // Update the latest historyId from the response
      if (response.data.historyId) {
        latestHistoryId = response.data.historyId;
      }

      // Extract message IDs from messagesAdded events
      const history = response.data.history || [];
      for (const record of history) {
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            if (added.message?.id) {
              messageIds.push(added.message.id);
            }
          }
        }
      }

      pageToken = response.data.nextPageToken || undefined;
      hasMore = !!pageToken;
    }

    // Deduplicate (same message can appear in multiple history records)
    const uniqueIds = [...new Set(messageIds)];
    console.log(`[Gmail API] History sync found ${uniqueIds.length} new messages (historyId: ${startHistoryId} -> ${latestHistoryId})`);

    return { messageIds: uniqueIds, newHistoryId: latestHistoryId };
  } catch (error: any) {
    // 404 means the historyId is too old / invalid
    if (error.code === 404 || error.response?.status === 404) {
      console.warn(`[Gmail API] History ID ${startHistoryId} expired, full sync required`);
      throw error;
    }
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

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}

export interface SendEmailResult {
  messageId: string;
  threadId: string;
}

/**
 * Create a MIME message for sending via Gmail API
 * Includes proper headers for email threading when replying
 */
function createMimeMessage(options: SendEmailOptions & { from: string }): string {
  const { to, subject, body, from, inReplyTo, references } = options;

  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  // Add threading headers if this is a reply
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
  }
  if (references) {
    headers.push(`References: ${references}`);
  }

  const messageParts = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body.replace(/\n/g, "<br>"),
    "",
    `--${boundary}--`,
  ];

  return messageParts.join("\r\n");
}

/**
 * Send an email reply via Gmail API
 * Supports threading when inReplyTo and threadId are provided
 */
export async function sendEmailReply(
  gmail: gmail_v1.Gmail,
  fromEmail: string,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const mimeMessage = createMimeMessage({
    ...options,
    from: fromEmail,
  });

  // Base64url encode the message
  const encodedMessage = Buffer.from(mimeMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log(`[Gmail API] Sending email reply to ${options.to}, subject: "${options.subject}"`);
  if (options.threadId) {
    console.log(`[Gmail API] Threading with threadId: ${options.threadId}`);
  }

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: options.threadId,
      },
    });

    if (!response.data.id || !response.data.threadId) {
      throw new Error("Failed to get message ID from Gmail response");
    }

    console.log(`[Gmail API] Email sent successfully. MessageId: ${response.data.id}, ThreadId: ${response.data.threadId}`);

    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
    console.error(`[Gmail API] Error sending email:`, err.message);
    if (err.response) {
      console.error(`[Gmail API] Response status: ${err.response.status}`);
      console.error(`[Gmail API] Response data:`, JSON.stringify(err.response.data));
    }
    throw error;
  }
}
