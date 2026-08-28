import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { caspioFetch } from "./caspio";

export const ACCOUNTS_TABLE_ID = "f246kq";
export const PLAYER_ACCESS_TABLE_ID = "f1o4u9";
export const PLAYERS_TABLE_ID = "k2a3fa";
const COOKIE_NAME = "ta_player_account";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

type Account = { AccountID: number; FirstName: string; LastName: string; Email: string; PasswordHash?: string | null; IsActive?: boolean | number | null };
type Access = { AccessID: number; PlayerID: number; AccountID: number; Relationship?: string | null; AccessLevel?: string | null; IsPrimary?: boolean | number | null; IsActive?: boolean | number | null; CanEditProfile?: boolean | number | null; CanAddSessions?: boolean | number | null; CanEditPlayerAddedSessions?: boolean | number | null; CanManageAccess?: boolean | number | null };
type Response<T> = { data: T[] };

function secret() {
  return process.env.AUTH_SECRET || process.env.CASPIO_CLIENT_SECRET || "";
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, Buffer.from(hash, "hex"));
  } catch { return false; }
}
export async function setAccountSession(accountId: number) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${accountId}.${expires}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${payload}.${sign(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}
export async function clearAccountSession() { (await cookies()).delete(COOKIE_NAME); }
export async function getAccountId() {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw || !secret()) return null;
  const [id, expires, signature] = raw.split(".");
  const payload = `${id}.${expires}`;
  const expected = sign(payload);
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) || Number(expires) < Math.floor(Date.now() / 1000)) return null;
  const accountId = Number(id);
  return Number.isInteger(accountId) && accountId > 0 ? accountId : null;
}
export async function findAccountByEmail(email: string) {
  const escaped = email.toLowerCase().replace(/'/g, "''");
  const result = await caspioFetch<Response<Account>>(`/tables/${ACCOUNTS_TABLE_ID}/records?select=AccountID,FirstName,LastName,Email,PasswordHash,IsActive&where=LOWER(Email)='${encodeURIComponent(escaped)}'&limit=1`);
  return result.data?.[0] ?? null;
}
export async function getAccount(accountId: number) {
  const result = await caspioFetch<Response<Account>>(`/tables/${ACCOUNTS_TABLE_ID}/records?select=AccountID,FirstName,LastName,Email,IsActive&where=AccountID=${accountId}&limit=1`);
  return result.data?.[0] ?? null;
}
export async function getPlayerAccess(accountId: number) {
  const result = await caspioFetch<Response<Access>>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,Relationship,AccessLevel,IsPrimary,IsActive,CanEditProfile,CanAddSessions,CanEditPlayerAddedSessions,CanManageAccess&where=AccountID=${accountId}&limit=100`);
  return (result.data ?? []).filter((row) => row.IsActive !== false && row.IsActive !== 0);
}
