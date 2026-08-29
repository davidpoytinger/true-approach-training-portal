import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../../lib/caspio";
import { requireCoachAdmin } from "../../../lib/coach-auth";
import { ACCOUNTS_TABLE_ID, PLAYER_ACCESS_TABLE_ID, findAccountByEmail, getAccount, hashPassword } from "../../../lib/player-auth";

export const dynamic = "force-dynamic";

type CoachAccess = {
  AccessID: number;
  AccountID: number;
  AccessLevel?: string | null;
  IsActive?: boolean | number | null;
  CanAddSessions?: boolean | number | null;
  CanEditPlayerAddedSessions?: boolean | number | null;
  CanManageAccess?: boolean | number | null;
};
type AccessResponse = { data?: CoachAccess[] };
type CreateAccountResponse = { data?: Array<{ AccountID?: number; PK_ID?: number }>; AccountID?: number; PK_ID?: number };
type Params = { saved?: string; error?: string };

async function getCoachRows() {
  const where = encodeURIComponent("PlayerID=0 AND Relationship='Coach'");
  const result = await caspioFetch<AccessResponse>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,AccountID,AccessLevel,IsActive,CanAddSessions,CanEditPlayerAddedSessions,CanManageAccess&where=${where}&orderBy=AccessID&limit=100`);
  return Promise.all((result.data ?? []).map(async access => ({ access, account: await getAccount(access.AccountID) })));
}

async function addCoach(formData: FormData) {
  "use server";
  await requireCoachAdmin();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const temporaryPassword = String(formData.get("temporaryPassword") ?? "");
  const role = String(formData.get("role") ?? "Coach") === "Admin" ? "Admin" : "Coach";
  if (!firstName || !lastName || !email) redirect("/coach/admin?error=missing");

  let account = await findAccountByEmail(email);
  let accountId = account?.AccountID ?? 0;
  if (!accountId) {
    if (temporaryPassword.length < 8) redirect("/coach/admin?error=password");
    const created = await caspioFetch<CreateAccountResponse>(`/tables/${ACCOUNTS_TABLE_ID}/records?echo=true`, {
      method: "POST",
      body: JSON.stringify({
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        PasswordHash: hashPassword(temporaryPassword),
        EmailVerified: true,
        IsActive: true,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      })
    });
    accountId = Number(created.data?.[0]?.AccountID ?? created.data?.[0]?.PK_ID ?? created.AccountID ?? created.PK_ID);
    if (!accountId) accountId = (await findAccountByEmail(email))?.AccountID ?? 0;
  }
  if (!accountId) redirect("/coach/admin?error=save");

  const existingWhere = encodeURIComponent(`AccountID=${accountId} AND PlayerID=0 AND Relationship='Coach'`);
  const existing = (await caspioFetch<AccessResponse>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,AccountID,IsActive&where=${existingWhere}&limit=1`)).data?.[0];
  if (existing) {
    await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`, {
      method: "PATCH",
      body: JSON.stringify({ where: `AccessID=${existing.AccessID}`, recordValues: { IsActive: true, AccessLevel: role, CanAddSessions: true, CanEditPlayerAddedSessions: true, CanManageAccess: role === "Admin" } })
    });
  } else {
    await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records`, {
      method: "POST",
      body: JSON.stringify({ PlayerID: 0, AccountID: accountId, Relationship: "Coach", AccessLevel: role, IsPrimary: false, IsActive: true, CanEditProfile: true, CanAddSessions: true, CanEditPlayerAddedSessions: true, CanManageAccess: role === "Admin", CreatedAt: new Date().toISOString() })
    });
  }
  redirect("/coach/admin?saved=added");
}

async function updateCoach(formData: FormData) {
  "use server";
  const admin = await requireCoachAdmin();
  const accessId = Number(formData.get("accessId"));
  const accountId = Number(formData.get("accountId"));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "Coach") === "Admin" ? "Admin" : "Coach";
  const isActive = formData.get("isActive") === "on";
  const canManagePlayers = formData.get("canManagePlayers") === "on";
  const canAddSessions = formData.get("canAddSessions") === "on";
  const canManageCoaches = role === "Admin" || formData.get("canManageCoaches") === "on";
  if (!accessId || !accountId || !firstName || !lastName || !email) redirect("/coach/admin?error=missing");
  if (accountId === admin.account.AccountID && !isActive) redirect("/coach/admin?error=self");
  const duplicate = await findAccountByEmail(email);
  if (duplicate && duplicate.AccountID !== accountId) redirect("/coach/admin?error=email");

  await caspioFetch(`/tables/${ACCOUNTS_TABLE_ID}/records?q.where=AccountID=${accountId}`, {
    method: "PUT",
    body: JSON.stringify({ FirstName: firstName, LastName: lastName, Email: email, UpdatedAt: new Date().toISOString() })
  });
  await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`, {
    method: "PATCH",
    body: JSON.stringify({ where: `AccessID=${accessId}`, recordValues: { AccessLevel: role, IsActive: isActive, CanEditProfile: true, CanAddSessions: canAddSessions, CanEditPlayerAddedSessions: canManagePlayers, CanManageAccess: canManageCoaches } })
  });
  redirect("/coach/admin?saved=updated");
}

export default async function CoachAdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireCoachAdmin();
  const params = await searchParams;
  const coaches = await getCoachRows();
  const error = params.error === "password" ? "A temporary password of at least 8 characters is required for a brand-new account."
    : params.error === "self" ? "You cannot deactivate your own coach account."
    : params.error === "email" ? "That email is already used by another account."
    : params.error ? "Unable to save that coach. Please check the required fields."
    : "";

  return (
    <main className="shell">
      <header className="topbar"><div><h1>Coach Management</h1></div><Link href="/coach" className="textLink">Coach Home</Link></header>
      {params.saved ? <p className="successBanner">Coach access {params.saved === "added" ? "added" : "updated"}.</p> : null}
      {error ? <p className="errorBanner">{error}</p> : null}

      <section className="card coachSection">
        <div className="label">ADD COACH</div>
        <h2>Create or Grant Coach Access</h2>
        <p className="muted">If the email already belongs to a Dugout account, the existing login will be granted coach access. For a new account, set a temporary password the coach can change in Account Settings.</p>
        <form className="form" action={addCoach}>
          <label>First Name<input name="firstName" required /></label>
          <label>Last Name<input name="lastName" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Temporary Password<input name="temporaryPassword" type="password" minLength={8} placeholder="Only required for a new account" /></label>
          <label>Role<select name="role" defaultValue="Coach"><option>Coach</option><option>Admin</option></select></label>
          <button className="button primary" type="submit">Add Coach</button>
        </form>
      </section>

      <section className="coachSection">
        <div className="label">COACH PROFILES</div>
        <h2>Manage Coaches</h2>
        <div className="stack">
          {coaches.map(({ access, account }) => account ? (
            <form className="card form" action={updateCoach} key={access.AccessID}>
              <input type="hidden" name="accessId" value={access.AccessID} />
              <input type="hidden" name="accountId" value={account.AccountID} />
              <div><strong>{account.FirstName} {account.LastName}</strong><div className="muted">{access.AccessLevel || "Coach"}</div></div>
              <label>First Name<input name="firstName" defaultValue={account.FirstName} required /></label>
              <label>Last Name<input name="lastName" defaultValue={account.LastName} required /></label>
              <label>Email<input name="email" type="email" defaultValue={account.Email} required /></label>
              <label>Role<select name="role" defaultValue={access.AccessLevel === "Admin" ? "Admin" : "Coach"}><option>Coach</option><option>Admin</option></select></label>
              <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input name="isActive" type="checkbox" defaultChecked={access.IsActive !== false && access.IsActive !== 0} style={{ width: "auto" }} /> Active coach</label>
              <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input name="canManagePlayers" type="checkbox" defaultChecked={access.CanEditPlayerAddedSessions !== false && access.CanEditPlayerAddedSessions !== 0} style={{ width: "auto" }} /> Manage players</label>
              <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input name="canAddSessions" type="checkbox" defaultChecked={access.CanAddSessions !== false && access.CanAddSessions !== 0} style={{ width: "auto" }} /> Add training sessions</label>
              <label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input name="canManageCoaches" type="checkbox" defaultChecked={access.CanManageAccess === true || access.CanManageAccess === 1 || access.AccessLevel === "Admin"} style={{ width: "auto" }} /> Manage coaches</label>
              <button className="button primary" type="submit">Save Coach</button>
            </form>
          ) : null)}
        </div>
      </section>
    </main>
  );
}
