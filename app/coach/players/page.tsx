import Link from "next/link";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";

type Player = { PlayerID: number; FirstName: string; LastName: string; Email?: string | null; IsActive: boolean };
type PlayerResponse = { data: Player[] };
type TrainingSession = { SessionID: number; PlayerID: number; SessionDate: string; Title: string; Status: string };
type SessionResponse = { data: TrainingSession[] };
type Params = { q?: string; created?: string; playerId?: string; parent?: string; invite?: string; emailed?: string; deleted?: string };

async function getPlayers(): Promise<Player[]> {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,Email,IsActive&where=IsActive=1&orderBy=LastName,FirstName&limit=500`);
  return result.data ?? [];
}

async function getSessions(): Promise<TrainingSession[]> {
  const result = await caspioFetch<SessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?select=SessionID,PlayerID,SessionDate,Title,Status&orderBy=SessionDate DESC,SessionID DESC&limit=500`);
  return result.data ?? [];
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function PlayerSearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [players, sessions] = await Promise.all([getPlayers(), getSessions()]);
  const query = (params.q ?? "").trim().toLowerCase();
  const filtered = players.filter((player) => {
    if (!query) return true;
    return `${player.FirstName} ${player.LastName} ${player.Email ?? ""}`.toLowerCase().includes(query);
  });

  const sessionsByPlayer = new Map<number, TrainingSession[]>();
  sessions.forEach((session) => {
    const current = sessionsByPlayer.get(session.PlayerID) ?? [];
    current.push(session);
    sessionsByPlayer.set(session.PlayerID, current);
  });

  const createdPlayer = params.playerId ? players.find((p) => p.PlayerID === Number(params.playerId)) : null;
  const inviteUrl = params.invite ? `https://true-approach-training-portal.vercel.app/accept-invite?token=${params.invite}` : "";

  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Players</h1></div><Link href="/coach" className="textLink">← Coach Home</Link></header>

      {params.deleted === "1" ? <div className="successBanner" role="status"><div className="successIcon">✓</div><div><strong>Player deleted</strong><p>The player was removed from the active portal. Existing session history was preserved.</p></div></div> : null}

      {params.created === "1" ? <div className="successBanner" role="status"><div className="successIcon">✓</div><div><strong>{createdPlayer ? `${createdPlayer.FirstName} ${createdPlayer.LastName} created successfully` : "Player created successfully"}</strong><p>{params.parent ? `Primary family access was connected to ${params.parent}.` : "The player is ready for training sessions."}</p></div></div> : null}

      {params.created === "1" && params.invite ? <section className="card coachSection"><div className="label">PARENT INVITATION</div><h2>{params.emailed === "1" ? "Invitation Email Created" : "Parent Invitation"}</h2><p className="muted">{params.emailed === "1" ? `True Approach Dugout sent the account invitation to ${params.parent || "the parent"}. The link expires in 7 days.` : `The invitation is ready for ${params.parent || "the parent"}. The link expires in 7 days.`}</p><details><summary className="textLink">Show invitation link</summary><input readOnly value={inviteUrl}/></details><div className="actions" style={{marginTop:16}}>{createdPlayer ? <><Link className="button primary" href={`/coach/session/new?playerId=${createdPlayer.PlayerID}`}>Add First Session</Link><Link className="button secondary" href={`/coach/players/${createdPlayer.PlayerID}`}>Edit Player</Link></> : null}</div></section> : null}

      {params.created === "1" && !params.invite && createdPlayer ? <section className="card coachSection"><div className="label">FAMILY ACCESS</div><h2>Existing Parent Account Linked</h2><p className="muted">The parent already had a True Approach Dugout account, so no invitation is needed.</p><div className="actions"><Link className="button primary" href={`/coach/session/new?playerId=${createdPlayer.PlayerID}`}>Add First Session</Link><Link className="button secondary" href={`/coach/players/${createdPlayer.PlayerID}`}>Edit Player</Link></div></section> : null}

      <section className="card coachSection">
        <div className="sectionHeadingRow"><div><div className="label">PLAYER DIRECTORY</div><h2>Search existing players</h2></div><Link href="/coach/players/new" className="button secondary">+ New Player</Link></div>
        <form className="playerSearch" action="/coach/players" method="get">
          <input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Search by player name or email" />
          <button className="button primary" type="submit">Search</button>
        </form>
        <p className="muted">{filtered.length} player{filtered.length === 1 ? "" : "s"}{query ? ` matching “${params.q}”` : ""}</p>

        <div className="playerList">
          {filtered.map((player) => {
            const playerSessions = sessionsByPlayer.get(player.PlayerID) ?? [];
            return (
              <article className="playerCard" key={player.PlayerID}>
                <div className="playerCardTop">
                  <div><h3>{player.FirstName} {player.LastName}</h3>{player.Email ? <div className="muted">{player.Email}</div> : null}</div>
                  <div className="actions"><Link className="button secondary" href={`/coach/players/${player.PlayerID}`}>Edit Player</Link><Link className="button primary" href={`/coach/session/new?playerId=${player.PlayerID}`}>Add Session</Link></div>
                </div>
                <div className="playerSessionSummary"><strong>{playerSessions.length} training session{playerSessions.length === 1 ? "" : "s"}</strong></div>
                {playerSessions.length ? <div className="miniSessionList">{playerSessions.slice(0, 4).map((session) => <Link href={`/coach/session/${session.SessionID}`} key={session.SessionID}><span>{session.Title}</span><span>{displayDate(session.SessionDate)} →</span></Link>)}</div> : <p className="muted">No sessions yet.</p>}
              </article>
            );
          })}
          {!filtered.length ? <p className="muted">No players found.</p> : null}
        </div>
      </section>
    </main>
  );
}
