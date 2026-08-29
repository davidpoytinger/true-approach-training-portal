import { createHmac, timingSafeEqual } from "crypto";

const GUEST_SESSION_SECONDS = 60 * 60 * 24 * 30;

type SessionAccessPayload = {
  sessionId: number;
  playerId: number;
  expires: number;
};

function secret() {
  return process.env.AUTH_SECRET || process.env.CASPIO_CLIENT_SECRET || "";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`session-access:${payload}`).digest("hex");
}

export function createSessionAccessToken(sessionId: number, playerId: number) {
  const expires = Math.floor(Date.now() / 1000) + GUEST_SESSION_SECONDS;
  const payload = `${sessionId}.${playerId}.${expires}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySessionAccessToken(token: string | null | undefined): SessionAccessPayload | null {
  if (!token || !secret()) return null;
  const [sessionIdRaw, playerIdRaw, expiresRaw, suppliedSignature] = token.split(".");
  if (!sessionIdRaw || !playerIdRaw || !expiresRaw || !suppliedSignature) return null;
  const payload = `${sessionIdRaw}.${playerIdRaw}.${expiresRaw}`;
  const expectedSignature = signature(payload);
  if (suppliedSignature.length !== expectedSignature.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))) return null;
  } catch {
    return null;
  }
  const sessionId = Number(sessionIdRaw);
  const playerId = Number(playerIdRaw);
  const expires = Number(expiresRaw);
  if (!Number.isInteger(sessionId) || sessionId <= 0 || !Number.isInteger(playerId) || playerId <= 0 || !Number.isInteger(expires)) return null;
  if (expires < Math.floor(Date.now() / 1000)) return null;
  return { sessionId, playerId, expires };
}
