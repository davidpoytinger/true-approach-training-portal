import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero card">
        <div className="eyebrow">TRUE APPROACH BASEBALL</div>
        <h1>Training Portal</h1>
        <p className="lead">Your most recent training videos, coach notes and session history in one place.</p>
        <div className="actions">
          <Link className="button primary" href="/player">Player Portal</Link>
          <Link className="button secondary" href="/coach">Coach Portal</Link>
        </div>
      </section>
    </main>
  );
}
