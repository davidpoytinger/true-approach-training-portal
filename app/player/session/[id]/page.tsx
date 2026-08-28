import Link from "next/link";
import { mockSessions } from "@/lib/mock-data";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = mockSessions.find((s) => s.id === Number(id)) ?? mockSessions[0];
  return (
    <main className="shell">
      <Link href="/player" className="textLink">← Back to sessions</Link>
      <section className="pageHeading"><div className="eyebrow">{session.date}</div><h1>{session.title}</h1><p className="lead">{session.coachNotes}</p></section>
      <div className="stack">{session.videos.map((video, index) => <article className="card videoCard" key={video.id}><div className="videoPlaceholder"><span>Video {index + 1}</span></div><h2>{video.title}</h2>{video.note && <p>{video.note}</p>}</article>)}</div>
    </main>
  );
}
