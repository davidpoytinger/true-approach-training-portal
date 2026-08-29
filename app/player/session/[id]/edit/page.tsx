import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { caspioFetch } from "../../../../../lib/caspio";
import PlayerContentFields from "../../../PlayerContentFields";
import MediaPreview from "../../../../MediaPreview";

export const dynamic = "force-dynamic";

const SESSIONS_TABLE_ID = "o1u972";
const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type TrainingSession = { PK_ID: number; SessionID: number; PlayerID: number; SessionDate: string; Title: string; CoachNotes?: string | null; Status: string; SessionSource?: string | null };
type SessionResponse = { data: TrainingSession[] };
type SessionVideo = { PK_ID: number; VideoID: number; SessionID: number; VideoFile: string; Title: string; CoachNote?: string | null; DisplayOrder?: number | null };
type VideoResponse = { data: SessionVideo[] };

async function getSession(sessionId: number) { const result = await caspioFetch<SessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?select=PK_ID,SessionID,PlayerID,SessionDate,Title,CoachNotes,Status,SessionSource&where=SessionID=${sessionId}&limit=1`); return result.data?.[0] ?? null; }
async function getContent(sessionId: number) { const result = await caspioFetch<VideoResponse>(`/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=PK_ID,VideoID,SessionID,VideoFile,Title,CoachNote,DisplayOrder&where=SessionID=${sessionId}&orderBy=DisplayOrder,VideoID&limit=200`); return result.data ?? []; }

async function savePlayerSession(sessionId: number, formData: FormData) {
  "use server";
  const session = await getSession(sessionId);
  if (!session || session.SessionSource !== "Player") notFound();
  const playerId = Number(formData.get("playerId"));
  if (playerId !== session.PlayerID) notFound();
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const sessionNotes = String(formData.get("sessionNotes") ?? "").trim();
  if (!sessionDate || !title) redirect(`/player/session/${sessionId}/edit?playerId=${playerId}&error=missing-fields`);
  const existingContent = await getContent(sessionId);
  const videoPaths = formData.getAll("videoPath").map((value) => String(value ?? "").trim());
  const originalNames = formData.getAll("videoOriginalName").map((value) => String(value ?? "").trim());
  const titles = formData.getAll("videoTitle").map((value) => String(value ?? "").trim());
  const notes = formData.getAll("videoNote").map((value) => String(value ?? "").trim());
  const newContent = videoPaths.map((path, index) => ({ path, originalName: originalNames[index] ?? "", title: titles[index] ?? "", note: notes[index] ?? "" })).filter((item) => Boolean(item.path));

  try {
    await caspioFetch(`/tables/${SESSIONS_TABLE_ID}/records/${session.PK_ID}`, { method: "PATCH", body: JSON.stringify({ SessionDate: sessionDate, Title: title, CoachNotes: sessionNotes || null }) });
    for (const item of existingContent) {
      const remove = formData.get(`remove_${item.PK_ID}`) === "1";
      if (remove) { await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records/${item.PK_ID}`, { method: "DELETE" }); continue; }
      const nextTitle = String(formData.get(`title_${item.PK_ID}`) ?? "").trim();
      const nextNote = String(formData.get(`note_${item.PK_ID}`) ?? "").trim();
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records/${item.PK_ID}`, { method: "PATCH", body: JSON.stringify({ Title: nextTitle || item.Title, CoachNote: nextNote || null }) });
    }
    const remainingCount = existingContent.filter((item) => formData.get(`remove_${item.PK_ID}`) !== "1").length;
    for (let index = 0; index < newContent.length; index += 1) {
      const item = newContent[index];
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records`, { method: "POST", body: JSON.stringify({ SessionID: sessionId, VideoFile: item.path, Title: item.title || item.originalName || null, CoachNote: item.note || null, DisplayOrder: remainingCount + index + 1 }) });
    }
  } catch (error) {
    console.error("Player session update failed", error);
    redirect(`/player/session/${sessionId}/edit?playerId=${playerId}&error=save-failed`);
  }
  redirect(`/player/session/${sessionId}?playerId=${playerId}&saved=1`);
}

function dateValue(value: string) { return new Date(value).toISOString().slice(0, 10); }
function fileName(path: string) { return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path); }

export default async function EditPlayerSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ playerId?: string; error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const sessionId = Number(id);
  const playerId = Number(query.playerId);
  if (!Number.isInteger(sessionId) || sessionId <= 0 || !Number.isInteger(playerId) || playerId <= 0) notFound();
  const [session, content] = await Promise.all([getSession(sessionId), getContent(sessionId)]);
  if (!session || session.PlayerID !== playerId || session.SessionSource !== "Player") notFound();
  const saveAction = savePlayerSession.bind(null, sessionId);

  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Edit Player Session</h1></div><Link href={`/player/session/${sessionId}?playerId=${playerId}`} className="textLink">← Back to Session</Link></header>
      <section className="card coachSection">
        <div className="label">YOUR SESSION</div><h2>{session.Title}</h2>
        {query.error === "missing-fields" ? <p className="errorBanner">Session date and title are required.</p> : null}
        {query.error === "save-failed" ? <p className="errorBanner">Unable to save your changes. Please try again.</p> : null}
        <form className="form" action={saveAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <label>Session Date<input name="sessionDate" type="date" defaultValue={dateValue(session.SessionDate)} required /></label>
          <label>Session Title<input name="title" type="text" defaultValue={session.Title} required /></label>
          <label>Session Notes<textarea name="sessionNotes" rows={5} defaultValue={session.CoachNotes ?? ""} /></label>
          <fieldset><legend>Current Content</legend><div className="videoFields">
            {content.length ? content.map((item) => <div className="videoEntry" key={item.VideoID}><div className="videoEntryHeader"><span className="muted">{fileName(item.VideoFile)}</span></div><MediaPreview src={`/api/video/${item.VideoID}`} alt={item.Title || fileName(item.VideoFile)} /><label>Content Title<input name={`title_${item.PK_ID}`} type="text" defaultValue={item.Title} /></label><label>Your Note<textarea name={`note_${item.PK_ID}`} rows={3} defaultValue={item.CoachNote ?? ""} /></label><label className="removeVideoCheck"><input name={`remove_${item.PK_ID}`} type="checkbox" value="1" /> Remove this content from the session</label></div>) : <p className="muted">This session does not have any content.</p>}
          </div></fieldset>
          <PlayerContentFields />
          <p className="muted">Use the section above only if you want to add more videos or pictures.</p>
          <div className="actions"><button className="button primary" type="submit">Save Changes</button><Link className="button secondary" href={`/player/session/${sessionId}?playerId=${playerId}`}>Cancel</Link></div>
        </form>
      </section>
    </main>
  );
}
