import Link from "next/link";
import { redirect } from "next/navigation";
import { clearAccountSession } from "../../lib/player-auth";
import { requireCoach } from "../../lib/coach-auth";

async function logout() {
  "use server";
  await clearAccountSession();
  redirect("/coach-login");
}

export default async function CoachDashboard() {
  const coach = await requireCoach();
  return (
    <main className="shell">
      <header className="topbar">
        <div><h1>Coach Portal</h1><div className="muted">Signed in as {coach.account.FirstName} {coach.account.LastName}</div></div>
        <div className="actions">
          <Link href="/account?from=coach" className="textLink">My Profile</Link>
          {coach.canManageCoaches ? <Link href="/coach/admin" className="textLink">Manage Coaches</Link> : null}
          <form action={logout}><button className="textLink" type="submit">Log out</button></form>
        </div>
      </header>

      <section className="coachHomeIntro">
        <p className="muted">Choose an action below to manage players and training sessions.</p>
      </section>

      <section className="coachActionGrid">
        {coach.canManagePlayers ? <Link href="/coach/players/new" className="coachActionCard">
          <div className="coachActionIcon">+</div>
          <div><h3>Create a New Player</h3><p>Add a player to True Approach so you can begin tracking their training.</p></div>
          <span className="coachActionArrow">→</span>
        </Link> : null}

        {coach.canManagePlayers ? <Link href="/coach/players" className="coachActionCard">
          <div className="coachActionIcon">⌕</div>
          <div><h3>Search Existing Players</h3><p>Find a player, review their session history, or add another training session.</p></div>
          <span className="coachActionArrow">→</span>
        </Link> : null}

        {coach.canAddSessions ? <Link href="/coach/session/new" className="coachActionCard">
          <div className="coachActionIcon">▶</div>
          <div><h3>Add a New Session</h3><p>Select a player, add notes and content, preview everything, and publish the session.</p></div>
          <span className="coachActionArrow">→</span>
        </Link> : null}
      </section>
    </main>
  );
}
