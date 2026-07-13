// Server-only Gmail API helpers.
import { decryptToken } from "./token-crypto.server";

const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1/users/me";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
    body?: { data?: string };
    mimeType?: string;
  };
}

interface GmailMessageDetail {
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

/**
 * Fetch unread emails from Gmail.
 * @param accessToken Decrypted Gmail access token
 * @param maxResults Number of emails to fetch (default 10)
 */
export async function fetchUnreadEmails(
  accessToken: string,
  maxResults = 10
): Promise<GmailMessageDetail[]> {
  try {
    // Get list of unread message IDs
    const listRes = await fetch(
      `${GMAIL_API_BASE}/messages?q=is:unread&maxResults=${maxResults}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error(`Gmail API error: ${listRes.status} ${err}`);
    }

    const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
    const messageIds = listData.messages?.map((m) => m.id) ?? [];

    if (messageIds.length === 0) {
      return [];
    }

    // Fetch details for each message
    const details = await Promise.all(
      messageIds.map((id) => fetchMessageDetail(accessToken, id))
    );

    return details.filter((d) => d !== null) as GmailMessageDetail[];
  } catch (err) {
    console.error("Error fetching unread emails:", err);
    return [];
  }
}

/**
 * Fetch a single message's details.
 */
async function fetchMessageDetail(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail | null> {
  try {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error(`Failed to fetch message ${messageId}: ${res.status}`);
      return null;
    }

    const msg = (await res.json()) as GmailMessage;
    const headers = msg.payload?.headers ?? [];

    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

    return {
      from: getHeader("from"),
      subject: getHeader("subject"),
      snippet: msg.snippet ?? "",
      date: msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : new Date().toISOString(),
      isUnread: msg.labelIds?.includes("UNREAD") ?? false,
    };
  } catch (err) {
    console.error(`Error fetching message ${messageId}:`, err);
    return null;
  }
}

/**
 * Refresh an access token using a refresh token.
 * Returns the new access token if successful.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials");
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!res.ok) {
      console.error(`Token refresh failed: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    return data.access_token ?? null;
  } catch (err) {
    console.error("Error refreshing access token:", err);
    return null;
  }
}
