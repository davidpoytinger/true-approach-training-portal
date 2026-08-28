import Link from "next/link";

export default function CoachDashboard() {
  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Coach Portal</h1></div>
        <Link href="/" className="textLink">Log out</Link>
      </header>

      <section className="coachHomeIntro">
        <div className="label">COACH DASHBOARD</div>
        <h2>What would you like to do?</h2>
        <p className="muted">Choose an action below to manage players and training sessions.</p>
      </section>

      <section className="coachActionGrid">
        <Link href="/coach/players/new" className="coachActionCard">
          <div className="coachActionIcon">+</div>
          <div>
            <h3>Create a New Player</h3>
            <p>Add a player to True Approach so you can begin tracking their training.</p>
          </div>
          <span className="coachActionArrow">→</span>
        </Link>

        <Link href="/coach/players" className="coachActionCard">
          <div className="coachActionIcon">⌕</div>
          <div>
            <h3>Search Existing Players</h3>
            <p>Find a player, review their session history, or add another training session.</p>
          </div>
          <span className="coachActionArrow">→</span>
        </Link>

        <Link href="/coach/session/new" className="coachActionCard">
          <div className="coachActionIcon">▶</div>
          <div>
            <h3>Add a New Session</h3>
            <p>Select a player, add notes and content, preview everything, and publish the session.</p>
          </div>
          <span className="coachActionArrow">→</span>
        </Link>
      </section>
    </main>
  );
}
