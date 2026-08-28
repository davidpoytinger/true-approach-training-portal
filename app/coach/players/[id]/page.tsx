import Link from "next/link";
import { createHash, randomBytes } from "crypto";
import { notFound, redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import { ACCOUNTS_TABLE_ID, PLAYER_ACCESS_TABLE_ID, PLAYERS_TABLE_ID, findAccountByEmail, getAccount } from "../../../../lib/player-auth";
import { sendParentInvitation } from "../../../../lib/email";
import { createSignedPlayerPhotoUrl } from "../../../../lib/player-photo-url";
import PlayerIdentity from "../../../PlayerIdentity";

export const dynamic = "force-dynamic";

type Player = {
  PlayerID: number;
  FirstName: string;
  LastName: string;
  DateOfBirth?: string | null;
  Team?: string | null;
  PrimaryPosition?: string | null;
  Bats?: string | null;
  Throws?: string | null;
  GraduationYear?: number | null;
  PlayerEmail?: string | null;
  Phone?: string | null;
  IsActive?: boolean | number | null;
};
type PlayerResponse = { data: Player[] };
type AccessRow = {
  AccessID: number;
  PlayerID: number;
  AccountID: number;
  Relationship?: string | null;
  IsPrimary?: boolean | number | null;
  IsActive?: boolean | number | null;
};
type AccessResponse = { data: AccessRow[] };
type CreateAccountResponse = { data?: Array<{ AccountID?: number; PK_ID?: number }>; AccountID?: number; PK_ID?: number };
type Params = { saved?: string; error?: string; parentAdded?: string; resent?: string; removed?: string };

async function getPlayer(playerId: number) {
  const result = await caspioFetch<PlayerResponse>(
    `/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,DateOfBirth,Team,PrimaryPosition,Bats,Throws,GraduationYear,PlayerEmail,Phone,IsActive&where=PlayerID=${playerId}&limit=1`
  );
  return result.data?.[0] ?? null;
}

async function savePlayer(formData: FormData) {
  "use server";
  const playerId = Number(formData.get("playerId"));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();
  const primaryPosition = String(formData.get("primaryPosition") ?? "").trim();
  const bats = String(formData.get("bats") ?? "").trim();
  const throws = String(formData.get("throws") ?? "").trim();
  const graduationYearRaw = String(formData.get("graduationYear") ?? "").trim();
  const playerEmail = String(formData.get("playerEmail") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!Number.isInteger(playerId) || playerId <= 0 || !firstName || !lastName) {
    redirect(`/coach/players/${playerId}?error=missing`);
  }

  try {
    await caspioFetch(`/tables/${PLAYERS_TABLE_ID}/records/bulk`, {
      method: "PATCH",
      body: JSON.stringify({
        where: `PlayerID=${playerId}`,
        recordValues: {
          FirstName: firstName,
          LastName: lastName,
          DateOfBirth: dateOfBirth || null,
          Team: team || null,
          PrimaryPosition: primaryPosition || null,
          Bats: bats || null,
          Throws: throws || null,
          GraduationYear: graduationYearRaw ? Number(graduationYearRaw) : null,
          PlayerEmail: playerEmail || null,
          Phone: phone || null
        }
      })
    });
  } catch (error) {
    console.error("Coach player profile update failed", error);
    redirect(`/coach/players/${playerId}?error=save`);
  }
  redirect(`/coach/players/${playerId}?saved=1`);
}

async function addFamilyAccess(formData: FormData) {
  "use server";
  const playerId = Number(formData.get("playerId"));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const relationship = String(formData.get("relationship") ?? "Parent").trim() || "Parent";
  if (!Number.isInteger(playerId) || playerId <= 0 || !firstName || !lastName || !email) {
    redirect(`/coach/players/${playerId}?error=family-missing`);
  }

  const player = await getPlayer(playerId);
  if (!player) redirect(`/coach/players/${playerId}?error=family-save`);

  try {
    const existingAccount = await findAccountByEmail(email);
    let accountId = existingAccount?.AccountID;
    let inviteToken = "";

    if (!accountId) {
      inviteToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(inviteToken).digest("hex");
      const created = await caspioFetch<CreateAccountResponse>(`/tables/${ACCOUNTS_TABLE_ID}/records?echo=true`, {
        method: "POST",
        body: JSON.stringify({
          FirstName: firstName,
          LastName: lastName,
          Email: email,
          IsActive: true,
          EmailVerified: false,
          EmailVerificationTokenHash: tokenHash,
          EmailVerificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        })
      });
      accountId = created.data?.[0]?.AccountID ?? created.data?.[0]?.PK_ID ?? created.AccountID ?? created.PK_ID;
      if (!accountId) accountId = (await findAccountByEmail(email))?.AccountID;
    }

    const linkedAccountId = Number(accountId);
    if (!Number.isInteger(linkedAccountId) || linkedAccountId <= 0) {
      redirect(`/coach/players/${playerId}?error=family-save`);
    }

    const existingAccess = (await caspioFetch<AccessResponse>(
      `/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,IsActive&where=PlayerID=${playerId}%20AND%20AccountID=${linkedAccountId}&limit=1`
    )).data?.[0];

    if (existingAccess) {
      if (existingAccess.IsActive === false || existingAccess.IsActive === 0) {
        await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`, {
          method: "PATCH",
          body: JSON.stringify({
            where: `AccessID=${existingAccess.AccessID}`,
            recordValues: { IsActive: true, EndedAt: null, Relationship: relationship }
          })
        });
      } else {
        redirect(`/coach/players/${playerId}?error=family-exists`);
      }
    } else {
      await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records`, {
        method: "POST",
        body: JSON.stringify({
          PlayerID: playerId,
          AccountID: linkedAccountId,
          Relationship: relationship,
          AccessLevel: "Full",
          IsPrimary: false,
          IsActive: true,
          CanEditProfile: true,
          CanAddSessions: true,
          CanEditPlayerAddedSessions: true,
          CanManageAccess: true,
          CreatedAt: new Date().toISOString()
        })
      });
    }

    if (inviteToken) {
      try {
        await sendParentInvitation({
          email,
          parentName: firstName || "Parent",
          playerName: `${player.FirstName} ${player.LastName}`,
          token: inviteToken
        });
      } catch (emailError) {
        console.error("Coach family invitation email failed", emailError);
        redirect(`/coach/players/${playerId}?parentAdded=${encodeURIComponent(email)}&error=family-email`);
      }
    }
  } catch (error) {
    console.error("Coach add family access failed", error);
    redirect(`/coach/players/${playerId}?error=family-save`);
  }

  redirect(`/coach/players/${playerId}?parentAdded=${encodeURIComponent(email)}`);
}

async function resendFamilyInvitation(formData: FormData) {
  "use server";
  const playerId = Number(formData.get("playerId"));
  const accountId = Number(formData.get("accountId"));
  if (!Number.isInteger(playerId) || playerId <= 0 || !Number.isInteger(accountId) || accountId <= 0) {
    redirect(`/coach/players/${playerId}?error=resend`);
  }

  const player = await getPlayer(playerId);
  const account = await getAccount(accountId);
  const access = (await caspioFetch<AccessResponse>(
    `/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,IsActive&where=PlayerID=${playerId}%20AND%20AccountID=${accountId}&limit=1`
  )).data?.[0];

  if (!player || !account || account.PasswordHash || !access || access.IsActive === false || access.IsActive === 0) {
    redirect(`/coach/players/${playerId}?error=resend`);
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await caspioFetch(`/tables/${ACCOUNTS_TABLE_ID}/records/bulk`, {
      method: "PATCH",
      body: JSON.stringify({
        where: `AccountID=${accountId}`,
        recordValues: {
          EmailVerified: false,
          EmailVerificationTokenHash: tokenHash,
          EmailVerificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          UpdatedAt: new Date().toISOString()
        }
      })
    });
    await sendParentInvitation({
      email: account.Email,
      parentName: account.FirstName || "Parent",
      playerName: `${player.FirstName} ${player.LastName}`,
      token
    });
  } catch (error) {
    console.error("Coach resend family invitation failed", error);
    redirect(`/coach/players/${playerId}?error=resend-email`);
  }
  redirect(`/coach/players/${playerId}?resent=${encodeURIComponent(account.Email)}`);
}

async function removeFamilyAccess(formData: FormData) {
  "use server";
  const playerId = Number(formData.get("playerId"));
  const accessId = Number(formData.get("accessId"));
  if (!Number.isInteger(playerId) || playerId <= 0 || !Number.isInteger(accessId) || accessId <= 0) {
    redirect(`/coach/players/${playerId}?error=family-remove`);
  }
  const access = (await caspioFetch<AccessResponse>(
    `/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,IsActive&where=AccessID=${accessId}&limit=1`
  )).data?.[0];
  if (!access || access.PlayerID !== playerId) redirect(`/coach/players/${playerId}?error=family-remove`);

  try {
    await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`, {
      method: "PATCH",
      body: JSON.stringify({
        where: `AccessID=${accessId}`,
        recordValues: { IsActive: false, EndedAt: new Date().toISOString() }
      })
    });
  } catch (error) {
    console.error("Coach remove family access failed", error);
    redirect(`/coach/players/${playerId}?error=family-remove`);
  }
  redirect(`/coach/players/${playerId}?removed=1`);
}

async function deletePlayer(formData: FormData) {
  "use server";
  const playerId = Number(formData.get("playerId"));
  const confirmed = String(formData.get("confirmDelete") ?? "") === "yes";
  if (!Number.isInteger(playerId) || playerId <= 0 || !confirmed) {
    redirect(`/coach/players/${playerId}?error=delete-confirm`);
  }

  try {
    await caspioFetch(`/tables/${PLAYERS_TABLE_ID}/records/bulk`, {
      method: "PATCH",
      body: JSON.stringify({ where: `PlayerID=${playerId}`, recordValues: { IsActive: false } })
    });
    await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`, {
      method: "PATCH",
      body: JSON.stringify({
        where: `PlayerID=${playerId} AND IsActive=1`,
        recordValues: { IsActive: false, EndedAt: new Date().toISOString() }
      })
    });
  } catch (error) {
    console.error("Coach player delete failed", error);
    redirect(`/coach/players/${playerId}?error=delete`);
  }
  redirect("/coach/players?deleted=1");
}

export default async function CoachPlayerProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { id } = await params;
  const query = await searchParams;
  const playerId = Number(id);
  if (!Number.isInteger(playerId) || playerId <= 0) notFound();
  const player = await getPlayer(playerId);
  if (!player || player.IsActive === false || player.IsActive === 0) notFound();
  const photoSrc = createSignedPlayerPhotoUrl(playerId);
  const dob = player.DateOfBirth ? String(player.DateOfBirth).slice(0, 10) : "";
  const accessRows = (await caspioFetch<AccessResponse>(
    `/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,Relationship,IsPrimary,IsActive&where=PlayerID=${playerId}&limit=100`
  )).data?.filter(row => row.IsActive !== false && row.IsActive !== 0) ?? [];
  const family = await Promise.all(accessRows.map(async row => ({ row, account: await getAccount(row.AccountID) })));

  const errorMessage = query.error === "missing" ? "First and last name are required."
    : query.error === "delete-confirm" ? "Please confirm that you want to delete this player."
    : query.error === "delete" ? "Unable to delete this player. Please try again."
    : query.error === "family-missing" ? "Please complete the parent or guardian name and email."
    : query.error === "family-exists" ? "That parent or guardian already has access to this player."
    : query.error === "family-email" ? "Family access was added, but the invitation email could not be sent. You can resend it below."
    : query.error === "family-save" ? "Unable to add family access. Please try again."
    : query.error === "family-remove" ? "Unable to remove family access. Please try again."
    : query.error === "resend-email" ? "The invitation was refreshed, but the email could not be sent. Please try again."
    : query.error === "resend" ? "That invitation cannot be resent because the account is already registered or no longer has active access."
    : query.error ? "Unable to save this player. Please try again."
    : "";

  return (
    <main className="shell">
      <header className="topbar">
        <div><h1>Edit Player</h1></div>
        <Link href="/coach/players" className="textLink">← Players</Link>
      </header>

      <section className="card coachSection">
        <PlayerIdentity playerId={playerId} firstName={player.FirstName} lastName={player.LastName} photoSrc={photoSrc} size={76} />
        {query.saved === "1" ? <p className="successBanner">Player profile updated successfully.</p> : null}
        {query.parentAdded ? <p className="successBanner">Family access added for {query.parentAdded}.</p> : null}
        {query.resent ? <p className="successBanner">A new invitation email was sent to {query.resent}. The new link expires in 7 days.</p> : null}
        {query.removed === "1" ? <p className="successBanner">Family access removed.</p> : null}
        {errorMessage ? <p className="errorBanner">{errorMessage}</p> : null}

        <div className="label">PLAYER PROFILE</div>
        <h2>Player Information</h2>
        <form className="form" action={savePlayer}>
          <input type="hidden" name="playerId" value={playerId} />
          <label>First Name<input name="firstName" defaultValue={player.FirstName} required /></label>
          <label>Last Name<input name="lastName" defaultValue={player.LastName} required /></label>
          <label>Date of Birth<input name="dateOfBirth" type="date" defaultValue={dob} /></label>
          <label>Team<input name="team" defaultValue={player.Team ?? ""} /></label>
          <label>Primary Position<input name="primaryPosition" defaultValue={player.PrimaryPosition ?? ""} /></label>
          <label>Bats<select name="bats" defaultValue={player.Bats ?? ""}><option value="">Select</option><option>Right</option><option>Left</option><option>Switch</option></select></label>
          <label>Throws<select name="throws" defaultValue={player.Throws ?? ""}><option value="">Select</option><option>Right</option><option>Left</option></select></label>
          <label>Graduation Year<input name="graduationYear" type="number" min="2020" max="2050" defaultValue={player.GraduationYear ?? ""} /></label>
          <label>Player Email<input name="playerEmail" type="email" defaultValue={player.PlayerEmail ?? ""} /></label>
          <label>Player Phone<input name="phone" type="tel" defaultValue={player.Phone ?? ""} /></label>
          <div className="actions"><button className="button primary" type="submit">Save Player Profile</button><Link className="button secondary" href={`/coach/session/new?playerId=${playerId}`}>Add Session</Link></div>
        </form>
      </section>

      <section className="card coachSection">
        <div className="label">FAMILY ACCESS</div>
        <h2>Parents & Guardians</h2>
        {family.length ? <div className="historyList">{family.map(({ row, account }) => (
          <div className="historyRow" key={row.AccessID}>
            <div>
              <strong>{account ? `${account.FirstName} ${account.LastName}` : `Account ${row.AccountID}`}</strong>
              <div className="muted">{account?.Email} · {row.Relationship || "Parent/Guardian"}{row.IsPrimary === true || row.IsPrimary === 1 ? " · Primary" : ""}{account && !account.PasswordHash ? " · Registration Pending" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {account && !account.PasswordHash ? <form action={resendFamilyInvitation}>
                <input type="hidden" name="playerId" value={playerId} />
                <input type="hidden" name="accountId" value={row.AccountID} />
                <button className="textLink" type="submit">Resend Invitation Email</button>
              </form> : null}
              <form action={removeFamilyAccess}>
                <input type="hidden" name="playerId" value={playerId} />
                <input type="hidden" name="accessId" value={row.AccessID} />
                <button className="textLink" type="submit">Remove Access</button>
              </form>
            </div>
          </div>
        ))}</div> : <p className="muted">No parent or guardian accounts are currently linked to this player.</p>}

        <div style={{ marginTop: 28 }}>
          <div className="label">ADD FAMILY MEMBER</div>
          <h2>Add a Parent or Guardian</h2>
          <p className="muted">If the email already belongs to a True Approach Dugout account, that account will be linked automatically. New accounts will receive an invitation email.</p>
          <form className="form" action={addFamilyAccess}>
            <input type="hidden" name="playerId" value={playerId} />
            <label>First Name<input name="firstName" required /></label>
            <label>Last Name<input name="lastName" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Relationship<select name="relationship" defaultValue="Parent"><option>Parent</option><option>Guardian</option><option>Grandparent</option><option>Other</option></select></label>
            <button className="button primary" type="submit">Add Family Access</button>
          </form>
        </div>
      </section>

      <section className="card coachSection" style={{ borderColor: "#e5b9b9" }}>
        <div className="label">DANGER ZONE</div>
        <h2>Delete Player</h2>
        <p className="muted">Deleting a player removes them from the active coach and family portals and removes family access. Their existing session history is preserved in the database.</p>
        <form className="form" action={deletePlayer}>
          <input type="hidden" name="playerId" value={playerId} />
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input name="confirmDelete" type="checkbox" value="yes" required style={{ width: "auto" }} />I understand that this will remove {player.FirstName} {player.LastName} from the active portal.</label>
          <button className="button secondary" type="submit" style={{ borderColor: "#b42318", color: "#b42318" }}>Delete Player</button>
        </form>
      </section>
    </main>
  );
}
