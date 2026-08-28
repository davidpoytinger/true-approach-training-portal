import Link from "next/link";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import { ACCOUNTS_TABLE_ID, PLAYER_ACCESS_TABLE_ID, PLAYERS_TABLE_ID, findAccountByEmail } from "../../../../lib/player-auth";
import { sendParentInvitation } from "../../../../lib/email";
import ParentAccountSelector from "./ParentAccountSelector";

export const dynamic = "force-dynamic";

type CreatePlayerResponse = { data?: Array<{ PlayerID?: number; PK_ID?: number }>; PlayerID?: number; PK_ID?: number };
type CreateAccountResponse = { data?: Array<{ AccountID?: number; PK_ID?: number }>; AccountID?: number; PK_ID?: number };
type Account = { AccountID: number; FirstName: string; LastName: string; Email: string; Phone?: string | null; IsActive?: boolean };
type AccountResponse = { data?: Account[] };
type Params = { error?: string };

function fail(code: string): never {
  redirect(`/coach/players/new?error=${code}`);
}

async function getAccounts(): Promise<Account[]> {
  const result = await caspioFetch<AccountResponse>(`/tables/${ACCOUNTS_TABLE_ID}/records?select=AccountID,FirstName,LastName,Email,Phone,IsActive&where=IsActive=1&orderBy=LastName,FirstName&limit=500`);
  return result.data ?? [];
}

async function getAccountById(accountId: number): Promise<Account | null> {
  const result = await caspioFetch<AccountResponse>(`/tables/${ACCOUNTS_TABLE_ID}/records?select=AccountID,FirstName,LastName,Email,Phone,IsActive&where=AccountID=${accountId}&limit=1`);
  return result.data?.[0] ?? null;
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

  const existingAccountId = Number(formData.get("existingAccountId")) || 0;
  const parentFirstName = String(formData.get("parentFirstName") ?? "").trim();
  const parentLastName = String(formData.get("parentLastName") ?? "").trim();
  const parentEmail = String(formData.get("parentEmail") ?? "").trim().toLowerCase();
  const parentPhone = String(formData.get("parentPhone") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "Parent").trim() || "Parent";

  if (!firstName || !lastName) fail("missing-fields");
  if (!existingAccountId && (!parentFirstName || !parentLastName || !parentEmail)) fail("missing-parent");

  let playerId = 0;
  let inviteToken = "";
  let linkedParentEmail = parentEmail;

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

    playerId = Number(createdPlayer.data?.[0]?.PlayerID ?? createdPlayer.data?.[0]?.PK_ID ?? createdPlayer.PlayerID ?? createdPlayer.PK_ID);
    if (!Number.isInteger(playerId) || playerId <= 0) throw new Error("Player ID was not returned");

    let accountId = existingAccountId || 0;

    if (accountId) {
      const existingAccount = await getAccountById(accountId);
      if (!existingAccount || existingAccount.IsActive === false) throw new Error("Selected parent account was not found");
      linkedParentEmail = existingAccount.Email;
    } else {
      const existingAccount = await findAccountByEmail(parentEmail);
      accountId = existingAccount?.AccountID ?? 0;

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
        accountId = Number(createdAccount.data?.[0]?.AccountID ?? createdAccount.data?.[0]?.PK_ID ?? createdAccount.AccountID ?? createdAccount.PK_ID);
        if (!Number.isInteger(accountId) || accountId <= 0) {
          const createdLookup = await findAccountByEmail(parentEmail);
          accountId = createdLookup?.AccountID ?? 0;
        }
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

    if (inviteToken) {
      try {
        await sendParentInvitation({ email: parentEmail, parentName: parentFirstName, playerName: `${firstName} ${lastName}`, token: inviteToken });
      } catch (emailError) {
        console.error("Parent invitation email failed", emailError);
      }
    }
  } catch (error) {
    console.error("Create player and parent failed", error);
    fail("save-failed");
  }

  const invitePart = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : "";
  const emailPart = inviteToken ? "&emailed=1" : "";
  redirect(`/coach/players?created=1&playerId=${playerId}&parent=${encodeURIComponent(linkedParentEmail)}${invitePart}${emailPart}`);
}

export default async function NewPlayerPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const accounts = await getAccounts();

  return (
    <main className="shell">
      <header className="topbar"><div><h1>New Player</h1></div><Link href="/coach" className="textLink">← Coach Home</Link></header>

      {params.error === "missing-fields" ? <p className="errorBanner">Player first and last name are required.</p> : null}
      {params.error === "missing-parent" ? <p className="errorBanner">Select an existing parent account or enter the new parent/guardian's name and email.</p> : null}
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
          <ParentAccountSelector accounts={accounts} />
          <label>Relationship<select name="relationship" defaultValue="Parent"><option>Parent</option><option>Guardian</option><option>Grandparent</option><option>Other</option></select></label>
        </section>

        <section className="card coachSection">
          <div className="label">STEP 3</div>
          <h2>Create Player & Family Access</h2>
          <p className="muted">If you selected an existing account, it will be linked immediately. If you entered a new parent, they will receive an invitation email to create a password.</p>
          <div className="actions"><button className="button primary" type="submit">Create Player & Parent Access</button><Link href="/coach" className="button secondary">Cancel</Link></div>
        </section>
      </form>
    </main>
  );
}
