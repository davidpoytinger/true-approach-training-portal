import Link from "next/link";

export default function CoachDashboard() {
  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Coach Portal</h1></div><Link href="/" className="textLink">Log out</Link></header>
      <section className="card"><div className="label">MVP COACH WORKFLOW</div><h2>Create a training session</h2>
        <form className="form">
          <label>Player<select defaultValue="sample"><option value="sample">Sample Player</option></select></label>
          <label>Session date<input type="date" defaultValue="2026-08-27" /></label>
          <label>Session title<input type="text" defaultValue="Hitting Session" /></label>
          <label>Overall coach notes<textarea rows={4} placeholder="What should the player focus on?" /></label>
          <fieldset><legend>Videos</legend><div className="uploadBox"><strong>Video 1</strong><input type="file" accept="video/*" /><input type="text" placeholder="Video title, e.g. Front View" /><textarea rows={3} placeholder="Optional note about this video" /></div><button className="button secondary" type="button">+ Add Another Video</button></fieldset>
          <button className="button primary" type="button">Publish Session</button>
        </form>
      </section>
    </main>
  );
}
