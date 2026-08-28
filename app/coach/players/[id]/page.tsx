import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import { PLAYER_ACCESS_TABLE_ID, PLAYERS_TABLE_ID } from "../../../../lib/player-auth";
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
type Params = { saved?: string; error?: string };

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

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Edit Player</h1></div>
        <Link href="/coach/players" className="textLink">← Players</Link>
      </header>

      <section className="card coachSection">
        <PlayerIdentity playerId={playerId} firstName={player.FirstName} lastName={player.LastName} src={photoSrc} size={76} />
        {query.saved === "1" ? <p className="successBanner">Player profile updated successfully.</p> : null}
        {query.error ? <p className="errorBanner">{query.error === "missing" ? "First and last name are required." : query.error === "delete-confirm" ? "Please confirm that you want to delete this player." : query.error === "delete" ? "Unable to delete this player. Please try again." : "Unable to save this player. Please try again."}</p> : null}

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
