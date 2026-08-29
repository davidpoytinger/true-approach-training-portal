import Link from "next/link";

export default function Home() {
  return (
    <main className="shell homeShell">
      <section className="hero card homeHero">
        <div className="homeHeroContent">
          <div className="homeEyebrow">TRUE APPROACH DUGOUT</div>
          <h1>Develop Your Game.</h1>
          <p className="lead">Training sessions, coach feedback, video and player development. All in one place.</p>
          <div className="actions">
            <Link className="button primary homePrimary" href="/login">Player Portal</Link>
            <Link className="button secondary" href="/coach">Coach Portal</Link>
          </div>
        </div>
        <div className="homeBaseballMark" aria-hidden="true">
          <span className="homeSeam homeSeamLeft" />
          <span className="homeSeam homeSeamRight" />
        </div>
      </section>
    </main>
  );
}
