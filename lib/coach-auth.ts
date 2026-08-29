import { redirect } from "next/navigation";
import { caspioFetch } from "./caspio";
import { Access, Account, PLAYER_ACCESS_TABLE_ID, getAccount, getAccountId } from "./player-auth";

export type CoachContext = {
  account: Account;
  access: Access;
  isAdmin: boolean;
  canManagePlayers: boolean;
  canAddSessions: boolean;
  canManageCoaches: boolean;
};

type Response<T> = { data: T[] };

export async function getCoachAccess(accountId: number) {
  const where = encodeURIComponent(`AccountID=${accountId} AND PlayerID=0 AND Relationship='Coach'`);
  const result = await caspioFetch<Response<Access>>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,Relationship,AccessLevel,IsActive,CanEditProfile,CanAddSessions,CanEditPlayerAddedSessions,CanManageAccess&where=${where}&limit=1`);
  const access = result.data?.[0] ?? null;
  if (!access || access.IsActive === false || access.IsActive === 0) return null;
  return access;
}

export async function getCurrentCoach(): Promise<CoachContext | null> {
  const accountId = await getAccountId();
  if (!accountId) return null;
  const [account, access] = await Promise.all([getAccount(accountId), getCoachAccess(accountId)]);
  if (!account || account.IsActive === false || account.IsActive === 0 || !access) return null;
  return {
    account,
    access,
    isAdmin: access.AccessLevel === "Admin",
    canManagePlayers: access.CanEditPlayerAddedSessions !== false && access.CanEditPlayerAddedSessions !== 0,
    canAddSessions: access.CanAddSessions !== false && access.CanAddSessions !== 0,
    canManageCoaches: access.CanManageAccess === true || access.CanManageAccess === 1 || access.AccessLevel === "Admin"
  };
}

export async function requireCoach() {
  const coach = await getCurrentCoach();
  if (!coach) redirect("/coach-login");
  return coach;
}

export async function requireCoachAdmin() {
  const coach = await requireCoach();
  if (!coach.canManageCoaches) redirect("/coach");
  return coach;
}

export async function createCoachAccess(accountId: number, role: "Coach" | "Admin" = "Coach") {
  await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records`, {
    method: "POST",
    body: JSON.stringify({
      PlayerID: 0,
      AccountID: accountId,
      Relationship: "Coach",
      AccessLevel: role,
      IsPrimary: false,
      IsActive: true,
      CanEditProfile: true,
      CanAddSessions: true,
      CanEditPlayerAddedSessions: true,
      CanManageAccess: role === "Admin",
      CreatedAt: new Date().toISOString()
    })
  });
}
