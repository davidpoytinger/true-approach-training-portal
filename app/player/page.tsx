import Link from "next/link";
import { caspioFetch } from "../../lib/caspio";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";

type Player = { PlayerID: number; FirstName: string; LastName: string; IsActive: boolean };
type PlayerResponse = { data: Player[] };
type TrainingSession = { SessionID: number; PlayerID: number; SessionDate: string; Title: string; CoachNotes?: string | null; Status: string };
type SessionResponse = { data: TrainingSession[] };

type Params = { playerId?: string };

async function getPlayers() {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,IsActive&where=IsActive=1&orderBy=LastName,FirstName&limit=500`);
  return result.data ?? [];
}

async function getSessions(playerId: number) {
  const result = await caspioFetch<SessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?select=SessionID,PlayerID,SessionDate,Title,CoachNotes,Status&where=PlayerID=${playerId}&orderBy=SessionDate DESC,SessionID DESC&limit=500`);
  return result.data ?? [];
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function plainText(value?: string | null) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function PlayerDashboard({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const players = await getPlayers();
  const requestedPlayerId = Number(params.playerId);
  const selectedPlayer = players.find((player) => player.PlayerID === requestedPlayerId) ?? players[0];

  if (!selectedPlayer) {
    return <main className="shell"><section className="card"><h1>Player Portal</h1><p>No active players are available yet.</p></section></main>;
  }

  const sessions = await getSessions(selectedPlayer.PlayerID);
  const latest = sessions[0];
  const playerId = selectedPlayer.PlayerID;

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>{selectedPlayer.FirstName} {selectedPlayer.LastName}</h1></div>
        <Link href="/" className="textLink">Log Out</Link>
      </header>

      <section className="card coachSection playerSelectorCard">
        <div className="label">PLAYER PORTAL PREVIEW</div>
        <p className="muted">Temporary player selector for testing. Login access will replace this later.</p>
        <form action="/player" method="get" className="playerSearch">
          <select name="playerId" defaultValue={String(playerId)}>
            {players.map((player) => <option key={player.PlayerID} value={player.PlayerID}>{player.FirstName} {player.LastName}</option>)}
          </select>
          <button className="button secondary" type="submit">Switch Player</button>
        </form>
      </section>

      <section className="coachHomeIntro">
        <div className="label">TRAINING</div>
        <h2>Your Training Portal</h2>
        <p className="lead">Review coach sessions, watch your content, and add training sessions of your own.</p>
      </section>

      <div className="coachActionGrid">
        <Link className="coachActionCard" href={`/player/session/new?playerId=${playerId}`}>
          <div className="coachActionIcon">+</div>
          <div><h3>Add My Own Session</h3><p>Upload videos or pictures from your own training and add notes for your coach.</p></div>
          <span className="coachActionArrow">→</span>
        </Link>
      </div>

      {latest ? (
        <section className="card latest" style={{ marginTop: 24 }}>
          <div className="label">LATEST SESSION</div>
          <h2>{latest.Title}</h2>
          <p>{displayDate(latest.SessionDate)}</p>
          {plainText(latest.CoachNotes) ? <p>{plainText(latest.CoachNotes)}</p> : null}
          <Link className="button primary" href={`/player/session/${latest.SessionID}?playerId=${playerId}`}>View Latest Session</Link>
        </section>
      ) : null}

      <section className="historySection">
        <div className="sectionHeadingRow"><div><div className="label">SESSION HISTORY</div><h2>All Sessions</h2></div></div>
        <div className="historyList">
          {sessions.map((session) => (
            <Link key={session.SessionID} className="historyRow" href={`/player/session/${session.SessionID}?playerId=${playerId}`}>
              <div><strong>{session.Title}</strong><div className="muted">{session.Status === "Player Submitted" ? "Player Session" : "Coach Session"}</div></div>
              <div className="historyMeta"><span>{displayDate(session.SessionDate)}</span><span>View →</span></div>
            </Link>
          ))}
          {!sessions.length ? <p className="muted">No training sessions yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
