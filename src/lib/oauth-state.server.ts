// Server-only signed state for OAuth CSRF protection.
import { createHash, createHmac, timingSafeEqual, randomBytes } from "crypto";

function key(): string {
  const k = process.env.TOKEN_ENCRYPTION_KEY;
  if (!k) throw new Error("Missing TOKEN_ENCRYPTION_KEY");
  return k;
}

export type OAuthStatePayload = {
  uid: string;
  type: "gmail" | "google_calendar";
  redirect: string;
  n: string; // nonce
  t: number; // issued at (ms)
};

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signState(payload: Omit<OAuthStatePayload, "n" | "t">): string {
  const full: OAuthStatePayload = { ...payload, n: randomBytes(12).toString("hex"), t: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  const mac = b64url(createHmac("sha256", key()).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyState(state: string): OAuthStatePayload {
  const [body, mac] = state.split(".");
  if (!body || !mac) throw new Error("Malformed state");
  const expected = b64url(createHmac("sha256", key()).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid state signature");
  const payload = JSON.parse(fromB64url(body).toString("utf8")) as OAuthStatePayload;
  if (Date.now() - payload.t > 15 * 60 * 1000) throw new Error("State expired");
  return payload;
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];

export const CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
