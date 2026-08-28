import Link from "next/link";
import { notFound } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";

export const dynamic = "force-dynamic";

const SESSIONS_TABLE_ID = "o1u972";
const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type TrainingSession = { SessionID: number; PlayerID: number; SessionDate: string; Title: string; CoachNotes?: string | null; Status: string };
type SessionResponse = { data: TrainingSession[] };
type SessionVideo = { VideoID: number; SessionID: number; VideoFile: string; Title: string; CoachNote?: string | null; DisplayOrder?: number | null };
type VideoResponse = { data: SessionVideo[] };

async function getSession(sessionId: number) {
  const result = await caspioFetch<SessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?select=SessionID,PlayerID,SessionDate,Title,CoachNotes,Status&where=SessionID=${sessionId}&limit=1`);
  return result.data?.[0] ?? null;
}

async function getContent(sessionId: number) {
  const result = await caspioFetch<VideoResponse>(`/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=VideoID,SessionID,VideoFile,Title,CoachNote,DisplayOrder&where=SessionID=${sessionId}&orderBy=DisplayOrder,VideoID&limit=200`);
  return result.data ?? [];
}

function dateValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function fileName(path: string) {
  return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
}

function isImagePath(path: string) {
  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i.test(fileName(path));
}

function isDocumentPath(path: string) {
  return /\.(doc|docx|pdf|ppt|pptx|xls|xlsx)$/i.test(fileName(path));
}

function documentLabel(path: string) {
  return fileName(path).split(".").pop()?.toUpperCase() || "DOC";
}

function safeRichText(value?: string | null) {
  return (value ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ playerId?: string; created?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const sessionId = Number(id);
  const playerId = Number(query.playerId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) notFound();

  const [session, content] = await Promise.all([getSession(sessionId), getContent(sessionId)]);
  if (!session) notFound();
  if (Number.isInteger(playerId) && playerId > 0 && session.PlayerID !== playerId) notFound();

  const backHref = `/player?playerId=${session.PlayerID}`;

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Review Session</h1></div>
        <Link href={backHref} className="textLink">← Player Portal</Link>
      </header>

      <section className="card coachSection">
        <div className="label">SESSION HISTORY</div>
        <h2>{session.Title}</h2>
        {query.created === "1" ? <div className="successBanner"><div className="successIcon">✓</div><div><strong>Session added successfully</strong><p>Your training session was saved.</p></div></div> : null}

        <div className="form readOnlyForm">
          <label>Session Date<input type="date" value={dateValue(session.SessionDate)} readOnly /></label>
          <label>Session Title<input type="text" value={session.Title} readOnly /></label>
          <div className="formField">
            <div className="formFieldLabel">{session.Status === "Player Submitted" ? "Your Session Notes" : "Overall Coach Notes"}</div>
            <div className="readOnlyRichText" dangerouslySetInnerHTML={{ __html: safeRichText(session.CoachNotes) || "<span class='muted'>No notes for this session.</span>" }} />
          </div>

          <fieldset>
            <legend>Content</legend>
            <div className="videoFields">
              {content.length ? content.map((item) => (
                <div className="videoEntry" key={item.VideoID}>
                  {isImagePath(item.VideoFile) ? (
                    <img className="storedVideoPreview" src={`/api/video/${item.VideoID}`} alt={item.Title || fileName(item.VideoFile)} />
                  ) : isDocumentPath(item.VideoFile) ? (
                    <a className="documentPreview storedDocument" href={`/api/video/${item.VideoID}`} target="_blank" rel="noreferrer">
                      <div className="documentIcon">{documentLabel(item.VideoFile)}</div>
                      <span><strong>{item.Title || fileName(item.VideoFile)}</strong><small>{fileName(item.VideoFile)}</small></span>
                    </a>
                  ) : (
                    <video className="storedVideoPreview" controls preload="metadata" src={`/api/video/${item.VideoID}`}>Your browser does not support video playback.</video>
                  )}
                  <label>Content Title<input type="text" value={item.Title} readOnly /></label>
                  <label>{session.Status === "Player Submitted" ? "Your Note" : "Content Coach Note"}<textarea rows={3} value={item.CoachNote ?? ""} readOnly /></label>
                </div>
              )) : <p className="muted">This session does not have any content.</p>}
            </div>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
