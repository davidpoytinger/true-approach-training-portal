import Link from "next/link";
import { mockSessions } from "@/lib/mock-data";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = mockSessions.find((s) => s.id === Number(id)) ?? mockSessions[0];
  return (
    <main className="shell">
      <Link href="/player" className="textLink">← Back to Sessions</Link>
      <section className="pageHeading"><div className="eyebrow">{session.date}</div><h1>{session.title}</h1><p className="lead">{session.coachNotes}</p></section>
      <div className="stack">{session.videos.map((content, index) => <article className="card videoCard" key={content.id}><div className="videoPlaceholder"><span>Content {index + 1}</span></div><h2>{content.title}</h2>{content.note && <p>{content.note}</p>}</article>)}</div>
    </main>
  );
}
