import Link from "next/link";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import { ACCOUNTS_TABLE_ID, PLAYER_ACCESS_TABLE_ID, PLAYERS_TABLE_ID, findAccountByEmail } from "../../../../lib/player-auth";

export const dynamic = "force-dynamic";

type CreatePlayerResponse = { data?: Array<{ PlayerID?: number; PK_ID?: number }>; PlayerID?: number; PK_ID?: number };
type CreateAccountResponse = { data?: Array<{ AccountID?: number; PK_ID?: number }>; AccountID?: number; PK_ID?: number };
type Params = { error?: string };

function fail(code: string): never {
  redirect(`/coach/players/new?error=${code}`);
}

async function createPlayer(formData: FormData) {
  "use server";

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();
  const primaryPosition = String(formData.get("primaryPosition") ?? "").trim();
  const bats = String(formData.get("bats") ?? "").trim();
  const throws = String(formData.get("throws") ?? "").trim();
  const graduationYear = Number(formData.get("graduationYear")) || null;
  const playerEmail = String(formData.get("playerEmail") ?? "").trim();
  const playerPhone = String(formData.get("playerPhone") ?? "").trim();

  const parentFirstName = String(formData.get("parentFirstName") ?? "").trim();
  const parentLastName = String(formData.get("parentLastName") ?? "").trim();
  const parentEmail = String(formData.get("parentEmail") ?? "").trim().toLowerCase();
  const parentPhone = String(formData.get("parentPhone") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "Parent").trim() || "Parent";

  if (!firstName || !lastName || !parentFirstName || !parentLastName || !parentEmail) fail("missing-fields");

  try {
    const createdPlayer = await caspioFetch<CreatePlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?echo=true`, {
      method: "POST",
      body: JSON.stringify({
        FirstName: firstName,
        LastName: lastName,
        DateOfBirth: dateOfBirth || null,
        Team: team || null,
        PrimaryPosition: primaryPosition || null,
        Bats: bats || null,
        Throws: throws || null,
        GraduationYear: graduationYear,
        PlayerEmail: playerEmail || null,
        Phone: playerPhone || null,
        IsActive: true
      })
    });

    const playerId = Number(
      createdPlayer.data?.[0]?.PlayerID ??
      createdPlayer.data?.[0]?.PK_ID ??
      createdPlayer.PlayerID ??
      createdPlayer.PK_ID
    );
    if (!Number.isInteger(playerId) || playerId <= 0) throw new Error("Player ID was not returned");

    const existingAccount = await findAccountByEmail(parentEmail);
    let accountId = existingAccount?.AccountID;
    let inviteToken = "";

    if (!accountId) {
      inviteToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(inviteToken).digest("hex");
      const createdAccount = await caspioFetch<CreateAccountResponse>(`/tables/${ACCOUNTS_TABLE_ID}/records?echo=true`, {
        method: "POST",
        body: JSON.stringify({
          FirstName: parentFirstName,
          LastName: parentLastName,
          Email: parentEmail,
          Phone: parentPhone || null,
          IsActive: true,
          EmailVerified: false,
          EmailVerificationTokenHash: tokenHash,
          EmailVerificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        })
      });
      accountId = Number(
        createdAccount.data?.[0]?.AccountID ??
        createdAccount.data?.[0]?.PK_ID ??
        createdAccount.AccountID ??
        createdAccount.PK_ID
      );
      if (!Number.isInteger(accountId) || accountId <= 0) {
        const createdLookup = await findAccountByEmail(parentEmail);
        accountId = createdLookup?.AccountID;
      }
    }

    if (!accountId) throw new Error("Parent account ID was not returned");

    await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records`, {
      method: "POST",
      body: JSON.stringify({
        PlayerID: playerId,
        AccountID: accountId,
        Relationship: relationship,
        AccessLevel: "Full",
        IsPrimary: true,
        IsActive: true,
        CanEditProfile: true,
        CanAddSessions: true,
        CanEditPlayerAddedSessions: true,
        CanManageAccess: true,
        CreatedAt: new Date().toISOString()
      })
    });

    const invitePart = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : "";
    redirect(`/coach/players?created=1&playerId=${playerId}&parent=${encodeURIComponent(parentEmail)}${invitePart}`);
  } catch (error) {
    console.error("Create player and parent failed", error);
    fail("save-failed");
  }
}

export default async function NewPlayerPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>New Player</h1></div><Link href="/coach" className="textLink">← Coach Home</Link></header>

      {params.error === "missing-fields" ? <p className="errorBanner">Player name and first parent/guardian name and email are required.</p> : null}
      {params.error === "save-failed" ? <p className="errorBanner">Unable to create the player and family access. Please try again.</p> : null}

      <form className="form" action={createPlayer}>
        <section className="card coachSection">
          <div className="label">STEP 1</div>
          <h2>Player Information</h2>
          <p className="muted">Create the player profile first. You can update any of these details later.</p>
          <label>First Name<input name="firstName" type="text" required /></label>
          <label>Last Name<input name="lastName" type="text" required /></label>
          <label>Date of Birth<input name="dateOfBirth" type="date" /></label>
          <label>Team<input name="team" type="text" /></label>
          <label>Primary Position<input name="primaryPosition" type="text" /></label>
          <label>Bats<select name="bats" defaultValue=""><option value="">Select</option><option>Right</option><option>Left</option><option>Switch</option></select></label>
          <label>Throws<select name="throws" defaultValue=""><option value="">Select</option><option>Right</option><option>Left</option></select></label>
          <label>Graduation Year<input name="graduationYear" type="number" min="2020" max="2050" /></label>
          <label>Player Email<input name="playerEmail" type="email" /></label>
          <label>Player Phone<input name="playerPhone" type="tel" /></label>
        </section>

        <section className="card coachSection">
          <div className="label">STEP 2</div>
          <h2>Primary Parent or Guardian</h2>
          <p className="muted">This person will be the first family account connected to the player and can add other family members later.</p>
          <label>First Name<input name="parentFirstName" type="text" required /></label>
          <label>Last Name<input name="parentLastName" type="text" required /></label>
          <label>Email<input name="parentEmail" type="email" required /></label>
          <label>Phone<input name="parentPhone" type="tel" /></label>
          <label>Relationship<select name="relationship" defaultValue="Parent"><option>Parent</option><option>Guardian</option><option>Grandparent</option><option>Other</option></select></label>
        </section>

        <section className="card coachSection">
          <div className="label">STEP 3</div>
          <h2>Create Player & Family Access</h2>
          <p className="muted">If the parent already has a True Approach account, the player will be linked to it. Otherwise an invitation will be created for them to set a password.</p>
          <div className="actions"><button className="button primary" type="submit">Create Player & Parent Access</button><Link href="/coach" className="button secondary">Cancel</Link></div>
        </section>
      </form>
    </main>
  );
}
