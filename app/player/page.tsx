import Link from "next/link";
import { mockPlayer, mockSessions } from "@/lib/mock-data";

export default function PlayerDashboard() {
  const latest = mockSessions[0];
  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>{mockPlayer.name}</h1></div><Link href="/" className="textLink">Log out</Link></header>
      <section className="card latest"><div className="label">LATEST SESSION</div><h2>{latest.title}</h2><p>{latest.date}</p><p>{latest.coachNotes}</p><Link className="button primary" href={`/player/session/${latest.id}`}>View Latest Session</Link></section>
      <section><h2>Previous Sessions</h2><div className="stack">{mockSessions.slice(1).map((session) => <Link key={session.id} className="card sessionRow" href={`/player/session/${session.id}`}><div><strong>{session.title}</strong><div className="muted">{session.date}</div></div><span>View →</span></Link>)}</div></section>
    </main>
  );
}
