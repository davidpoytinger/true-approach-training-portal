import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../lib/caspio";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";

type Player = {
  PlayerID: number;
  FirstName: string;
  LastName: string;
  IsActive: boolean;
};

type PlayerResponse = {
  data: Player[];
};

type CreateSessionResponse = {
  PK_ID?: number;
  SessionID?: number;
};

async function getPlayers(): Promise<Player[]> {
  const result = await caspioFetch<PlayerResponse>(
    `/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,IsActive&where=IsActive=1&orderBy=LastName,FirstName&limit=200`
  );

  return result.data ?? [];
}

async function publishSession(formData: FormData) {
  "use server";

  const playerId = Number(formData.get("playerId"));
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const coachNotes = String(formData.get("coachNotes") ?? "").trim();

  if (!Number.isInteger(playerId) || playerId <= 0 || !sessionDate || !title) {
    redirect("/coach?error=missing-fields");
  }

  try {
    await caspioFetch<CreateSessionResponse>(
      `/tables/${SESSIONS_TABLE_ID}/records?echo=true`,
      {
        method: "POST",
        body: JSON.stringify({
          PlayerID: playerId,
          SessionDate: sessionDate,
          Title: title,
          CoachNotes: coachNotes || null,
          Status: "Published",
          PublishedAt: new Date().toISOString()
        })
      }
    );
  } catch {
    redirect("/coach?error=save-failed");
  }

  redirect("/coach?saved=1");
}

export default async function CoachDashboard({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  let players: Player[] = [];
  let playerLoadError = false;

  try {
    players = await getPlayers();
  } catch {
    playerLoadError = true;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Coach Portal</h1></div><Link href="/" className="textLink">Log out</Link></header>
      <section className="card"><div className="label">MVP COACH WORKFLOW</div><h2>Create a training session</h2>
        {params.saved === "1" ? <p>Session published successfully.</p> : null}
        {params.error === "missing-fields" ? <p>Please select a player and enter a session date and title.</p> : null}
        {params.error === "save-failed" ? <p>Unable to save the session. Please try again.</p> : null}
        <form className="form" action={publishSession}>
          <label>Player
            <select name="playerId" defaultValue="" required>
              <option value="" disabled>{playerLoadError ? "Unable to load players" : players.length ? "Select a player" : "No active players yet"}</option>
              {players.map((player) => (
                <option key={player.PlayerID} value={player.PlayerID}>
                  {player.FirstName} {player.LastName}
                </option>
              ))}
            </select>
          </label>
          <label>Session date<input name="sessionDate" type="date" defaultValue={today} required /></label>
          <label>Session title<input name="title" type="text" defaultValue="Hitting Session" required /></label>
          <label>Overall coach notes<textarea name="coachNotes" rows={4} placeholder="What should the player focus on?" /></label>
          <fieldset>
            <legend>Videos</legend>
            <div className="uploadBox">
              <strong>Video upload is next</strong>
              <p>The session record will be saved to Caspio now. Multiple-video upload will be connected in the next step.</p>
            </div>
          </fieldset>
          <button className="button primary" type="submit" disabled={!players.length || playerLoadError}>Publish Session</button>
        </form>
      </section>
    </main>
  );
}
