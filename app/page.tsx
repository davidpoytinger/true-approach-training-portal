import Link from "next/link";

const logoUrl = "https://a6defeefbe5ec18834b4.cdn6.editmysite.com/uploads/b/a6defeefbe5ec18834b4ae0b514e538d4f57ff7d613345ef065b5ef7daa9dcfa/TA%20transparent%20PNG_1777845753.png?width=2400&optimize=medium";

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
        <div className="homeTaWatermark" aria-hidden="true">
          <img src={logoUrl} alt="" />
        </div>
      </section>
    </main>
  );
}
